"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { updateStatusSchema } from "@/lib/validation";
import { isTerminalStatus, NEXT_STATUSES, type RequestStatus } from "@/lib/sla";

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
