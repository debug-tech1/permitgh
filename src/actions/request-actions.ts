"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { addAttachmentsSchema, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, submitRequestSchema } from "@/lib/validation";
import { computeSlaDeadline } from "@/lib/sla";
import { isOfficerBilled } from "@/lib/fees";

export type ActionState = { error?: string } | undefined;

export async function submitRequest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["citizen"]);

  const parsed = submitRequestSchema.safeParse({
    serviceTypeId: formData.get("serviceTypeId"),
    applicantNote: formData.get("applicantNote"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const serviceType = await prisma.serviceType.findUnique({ where: { id: parsed.data.serviceTypeId } });
  if (!serviceType) {
    return { error: "Choose a valid service type." };
  }

  // Cost for an officer-billed service (tiered, or Building Permit's
  // rate x area formula) is set later by the reviewing officer, not the
  // applicant — see actions/officer-actions.ts. Flat-fee services still
  // get their fee applied immediately, since there's no judgment call.
  const feeGhs = isOfficerBilled(serviceType) ? null : serviceType.feeGhs;

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

// Lets a citizen respond to "Additional Info Needed" by adding documents to
// their existing request, rather than leaving them stuck with a note and no
// way to act on it. Doesn't change status — the officer reviews and moves
// it themselves, same as any other status transition.
export async function addAttachments(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession(["citizen"]);

  const parsed = addAttachmentsSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) {
    return { error: "Check your input and try again." };
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { _count: { select: { attachments: true } } },
  });
  if (!request || request.citizenId !== session.sub) {
    return { error: "That request isn't yours." };
  }

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Choose at least one file." };
  }
  if (request._count.attachments + files.length > MAX_ATTACHMENTS) {
    return { error: `This request can have at most ${MAX_ATTACHMENTS} attachments in total.` };
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
  await prisma.attachment.createMany({
    data: attachments.map((a) => ({ requestId: request.id, fileName: a.fileName, fileUrl: a.dataUrl })),
  });

  revalidatePath(`/citizen/requests/${request.id}`);
  revalidatePath("/officer/queue");
}
