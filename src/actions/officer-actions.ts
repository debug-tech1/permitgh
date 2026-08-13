"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  assessFeeSchema,
  billBuildingPermitSchema,
  confirmPaymentSchema,
  updateStatusSchema,
} from "@/lib/validation";
import { isTerminalStatus, NEXT_STATUSES, type RequestStatus } from "@/lib/sla";
import { BUILDING_PERMIT_RATES, findFeeTier, parseFeeTiers } from "@/lib/fees";
import { formatFee } from "@/lib/format";

export type ActionState = { error?: string } | undefined;

export async function updateRequestStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["officer"]);

  const parsed = updateStatusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    remark: formData.get("remark"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  // Re-read from a trusted source (session + DB), never trust the client's
  // claim about which request/service type it belongs to.
  const request = await prisma.serviceRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.serviceTypeId !== session.assignedServiceTypeId) {
    return { error: "That request isn't in your queue." };
  }
  if (isTerminalStatus(request.status)) {
    return { error: "This request is already closed." };
  }
  // Enforce FIG. 4's transition graph server-side too — the UI only offers
  // valid next states, but a direct POST must not be able to skip states.
  const allowed = NEXT_STATUSES[request.status as RequestStatus] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return { error: "That status change isn't allowed from the current state." };
  }
  // Approval requires the request to have been billed AND paid — cost is
  // always an officer's call (see billBuildingPermit/assessFee below), and
  // PermitGH doesn't process payment itself, so a human has to confirm it
  // happened (see confirmPayment below) before a permit can be granted.
  if (parsed.data.status === "approved") {
    if (request.feeGhs === null) {
      return { error: "Bill this request before approving." };
    }
    if (request.paidAt === null) {
      return { error: "Confirm payment before approving." };
    }
  }

  const changedAt = new Date();
  await prisma.$transaction([
    prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.status,
        resolvedAt: isTerminalStatus(parsed.data.status) ? changedAt : null,
      },
    }),
    prisma.statusHistory.create({
      data: {
        requestId: request.id,
        status: parsed.data.status,
        remark: parsed.data.remark || null,
        changedById: session.sub,
        changedAt,
      },
    }),
  ]);

  revalidatePath("/officer/queue");
  revalidatePath(`/citizen/requests/${request.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

function waiverSuffix(waiverGhs: number, waiverReason: string | undefined, netGhs: number): string {
  if (waiverGhs <= 0) return "";
  return ` − Waiver ${formatFee(waiverGhs)} (${waiverReason}) = ${formatFee(netGhs)} net`;
}

// The officer's judgment call on cost for a business category / property
// type-purpose combination — see lib/fees.ts. Settable (and re-settable)
// any time before the request reaches a terminal status.
export async function assessFee(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["officer"]);

  const parsed = assessFeeSchema.safeParse({
    requestId: formData.get("requestId"),
    sizeTier: formData.get("sizeTier"),
    waiverGhs: formData.get("waiverGhs") || undefined,
    waiverReason: formData.get("waiverReason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { serviceType: true },
  });
  if (!request || request.serviceTypeId !== session.assignedServiceTypeId) {
    return { error: "That request isn't in your queue." };
  }
  if (isTerminalStatus(request.status)) {
    return { error: "This request is already closed." };
  }

  const tiers = parseFeeTiers(request.serviceType.feeTiers);
  const tier = findFeeTier(tiers, parsed.data.sizeTier);
  if (!tier) {
    return { error: "Choose a valid option." };
  }

  const netGhs = Math.max(0, tier.feeGhs - parsed.data.waiverGhs);
  const billingDetail = `${tier.label}: ${formatFee(tier.feeGhs)}${waiverSuffix(parsed.data.waiverGhs, parsed.data.waiverReason, netGhs)}`;

  await prisma.serviceRequest.update({
    where: { id: request.id },
    data: {
      feeGhs: netGhs,
      sizeTier: tier.label,
      billingDetail,
      waiverGhs: parsed.data.waiverGhs,
      waiverReason: parsed.data.waiverGhs > 0 ? (parsed.data.waiverReason ?? null) : null,
      paidAt: null, // re-billing resets any prior payment confirmation
    },
  });

  revalidatePath("/officer/queue");
  revalidatePath(`/citizen/requests/${request.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

// Building Permit's cost isn't a tier pick — it's rate x area + a
// processing charge the officer sets at their discretion. See
// lib/fees.ts#BUILDING_PERMIT_RATES for the allowed rate band per type.
export async function billBuildingPermit(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["officer"]);

  const parsed = billBuildingPermitSchema.safeParse({
    requestId: formData.get("requestId"),
    propertyType: formData.get("propertyType"),
    areaSqm: formData.get("areaSqm"),
    rate: formData.get("rate"),
    processingFee: formData.get("processingFee"),
    waiverGhs: formData.get("waiverGhs") || undefined,
    waiverReason: formData.get("waiverReason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }
  const { propertyType, areaSqm, rate, processingFee, waiverGhs, waiverReason } = parsed.data;

  const band = BUILDING_PERMIT_RATES[propertyType];
  if (rate < band.min || rate > band.max) {
    return { error: `Rate for ${band.label.toLowerCase()} must be between GH₵${band.min} and GH₵${band.max} per m².` };
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.serviceTypeId !== session.assignedServiceTypeId) {
    return { error: "That request isn't in your queue." };
  }
  if (isTerminalStatus(request.status)) {
    return { error: "This request is already closed." };
  }

  const base = Math.round(rate * areaSqm);
  const gross = base + processingFee;
  const netGhs = Math.max(0, gross - waiverGhs);
  const billingDetail =
    `${band.label}: ${areaSqm}m² × GH₵${rate}/m² = ${formatFee(base)} + Processing ${formatFee(processingFee)} = ${formatFee(gross)}` +
    waiverSuffix(waiverGhs, waiverReason, netGhs);

  await prisma.serviceRequest.update({
    where: { id: request.id },
    data: {
      feeGhs: netGhs,
      billingDetail,
      waiverGhs,
      waiverReason: waiverGhs > 0 ? (waiverReason ?? null) : null,
      paidAt: null, // re-billing resets any prior payment confirmation
    },
  });

  revalidatePath("/officer/queue");
  revalidatePath(`/citizen/requests/${request.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

// PermitGH never processes payment itself (see confirmation-page
// disclaimers) — this just records that the officer confirmed it happened
// through the Assembly's existing channels. Required before approval.
export async function confirmPayment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["officer"]);

  const parsed = confirmPaymentSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) {
    return { error: "Check your input and try again." };
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.serviceTypeId !== session.assignedServiceTypeId) {
    return { error: "That request isn't in your queue." };
  }
  if (isTerminalStatus(request.status)) {
    return { error: "This request is already closed." };
  }
  if (request.feeGhs === null) {
    return { error: "Bill this request before confirming payment." };
  }

  await prisma.serviceRequest.update({
    where: { id: request.id },
    data: { paidAt: new Date() },
  });

  revalidatePath("/officer/queue");
  revalidatePath(`/citizen/requests/${request.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}
