"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, submitRequestSchema } from "@/lib/validation";
import { computeSlaDeadline } from "@/lib/sla";
import { parseFeeTiers } from "@/lib/fees";

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

  // Cost for a tiered service is an officer's call, not the applicant's —
  // see actions/officer-actions.ts#assessFee. Leave it unset at submission;
  // flat-fee services still get their fee applied immediately, since there's
  // no judgment call to make.
  const tiers = parseFeeTiers(serviceType.feeTiers);
  const feeGhs = tiers.length > 0 ? null : serviceType.feeGhs;

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
