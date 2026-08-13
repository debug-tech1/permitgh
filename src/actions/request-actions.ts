"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { MAX_ATTACHMENT_BYTES, submitRequestSchema } from "@/lib/validation";
import { computeSlaDeadline } from "@/lib/sla";

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

  // Validate the attachment before writing anything, so a rejected upload
  // never leaves behind a request with no file.
  let attachment: { fileName: string; dataUrl: string } | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: "Attachment is too large — 2MB maximum." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    attachment = {
      fileName: file.name,
      dataUrl: `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`,
    };
  }

  const submittedAt = new Date();
  const request = await prisma.serviceRequest.create({
    data: {
      citizenId: session.sub,
      serviceTypeId: serviceType.id,
      status: "received",
      applicantNote: parsed.data.applicantNote,
      submittedAt,
      slaDeadline: computeSlaDeadline(submittedAt, serviceType.slaDays),
    },
  });

  await prisma.statusHistory.create({
    data: { requestId: request.id, status: "received", changedById: session.sub, changedAt: submittedAt },
  });

  if (attachment) {
    await prisma.attachment.create({
      data: { requestId: request.id, fileName: attachment.fileName, fileUrl: attachment.dataUrl },
    });
  }

  revalidatePath("/citizen/requests");
  redirect(`/citizen/requests/${request.id}`);
}
