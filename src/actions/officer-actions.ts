"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { assessFeeSchema, updateStatusSchema } from "@/lib/validation";
import { isTerminalStatus, NEXT_STATUSES, type RequestStatus } from "@/lib/sla";
import { findFeeTier, parseFeeTiers } from "@/lib/fees";

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
  // Cost for a tiered service is an officer's call (see assessFee below) —
  // a request can't be approved until that call has actually been made.
  if (parsed.data.status === "approved" && request.feeGhs === null) {
    return { error: "Assess the fee before approving this request." };
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

// The officer's judgment call on cost for a tiered service — see
// lib/fees.ts. Settable (and re-settable) any time before the request
// reaches a terminal status; updateRequestStatus above refuses to approve
// until this has actually been called at least once.
export async function assessFee(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["officer"]);

  const parsed = assessFeeSchema.safeParse({
    requestId: formData.get("requestId"),
    sizeTier: formData.get("sizeTier"),
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
    return { error: "Choose a valid size." };
  }

  await prisma.serviceRequest.update({
    where: { id: request.id },
    data: { feeGhs: tier.feeGhs, sizeTier: tier.label },
  });

  revalidatePath("/officer/queue");
  revalidatePath(`/citizen/requests/${request.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}
