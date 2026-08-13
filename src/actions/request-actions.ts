"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, submitRequestSchema } from "@/lib/validation";
import { computeSlaDeadline } from "@/lib/sla";
import { findFeeTier, parseFeeTiers } from "@/lib/fees";

export type ActionState = { error?: string } | undefined;

export async function submitRequest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["citizen"]);

  const parsed = submitRequestSchema.safeParse({
    serviceTypeId: formData.get("serviceTypeId"),
    applicantNote: formData.get("applicantNote"),
    sizeTier: formData.get("sizeTier") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const serviceType = await prisma.serviceType.findUnique({ where: { id: parsed.data.serviceTypeId } });
  if (!serviceType) {
    return { error: "Choose a valid service type." };
  }

  // If the service has size-based pricing, the citizen must pick a valid
  // tier — the fee snapshot below depends on it. Flat-fee services ignore
  // whatever (if anything) was submitted here.
  const tiers = parseFeeTiers(serviceType.feeTiers);
  let feeGhs = serviceType.feeGhs;
  let sizeTier: string | null = null;
  if (tiers.length > 0) {
    const tier = findFeeTier(tiers, parsed.data.sizeTier);
    if (!tier) {
      return { error: "Choose a size to see the correct fee." };
    }
    feeGhs = tier.feeGhs;
    sizeTier = tier.label;
  }

  // Validate every attachment before writing anything, so a rejected upload
  // never leaves behind a request with only some of its files.
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_ATTACHMENTS) {
    return { error: `Attach at most ${MAX_ATTACHMENTS} files.` };
  }
  const oversized = files.find((f) => f.size > MAX_ATTACHMENT_BYTES);
  if (oversized) {
    return { error: `"${oversized.name}" is too large — 2MB maximum per file.` };
  }
  const attachments = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        fileName: file.name,
        dataUrl: `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`,
      };
    }),
  );

  const submittedAt = new Date();
  const request = await prisma.serviceRequest.create({
    data: {
      citizenId: session.sub,
      serviceTypeId: serviceType.id,
      status: "received",
      applicantNote: parsed.data.applicantNote,
      submittedAt,
      slaDeadline: computeSlaDeadline(submittedAt, serviceType.slaDays),
      feeGhs,
      sizeTier,
    },
  });

  await prisma.statusHistory.create({
    data: { requestId: request.id, status: "received", changedById: session.sub, changedAt: submittedAt },
  });

  if (attachments.length > 0) {
    await prisma.attachment.createMany({
      data: attachments.map((a) => ({ requestId: request.id, fileName: a.fileName, fileUrl: a.dataUrl })),
    });
  }

  revalidatePath("/citizen/requests");
  redirect(`/citizen/requests/${request.id}`);
}
