"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateTempPassword, hashPassword, requireSession } from "@/lib/auth";
import { resetPasswordSchema, serviceConfigSchema } from "@/lib/validation";

export type ActionState = { error?: string; newPassword?: string } | undefined;

// Updates the SLA and fee policy for future requests only. Requests already
// submitted keep the deadline computed at submission time (FIG. 1 / FIG. 5)
// — changing the policy must never silently move an in-flight request's
// clock or its displayed fee.
export async function updateServiceTypeConfig(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession(["admin"]);

  const parsed = serviceConfigSchema.safeParse({
    serviceTypeId: formData.get("serviceTypeId"),
    slaDays: formData.get("slaDays"),
    feeGhs: formData.get("feeGhs"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  await prisma.serviceType.update({
    where: { id: parsed.data.serviceTypeId },
    data: { slaDays: parsed.data.slaDays, feeGhs: parsed.data.feeGhs },
  });

  revalidatePath("/admin/service-types");
  revalidatePath("/");
}

// PermitGH has no email integration (a deliberate, documented gap — see
// README), so there's no self-service "forgot password" link to send.
// Instead an admin generates a fresh temporary password here, shown once,
// which they relay to the user through the Assembly's own channels.
export async function resetUserPassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession(["admin"]);

  const parsed = resetPasswordSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return { error: "Check your input and try again." };
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return { error: "That user no longer exists." };
  }

  const newPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  revalidatePath("/admin/users");
  return { newPassword };
}
