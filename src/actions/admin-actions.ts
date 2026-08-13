"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { serviceConfigSchema } from "@/lib/validation";

export type ActionState = { error?: string } | undefined;

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
