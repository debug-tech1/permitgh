"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { slaConfigSchema } from "@/lib/validation";

export type ActionState = { error?: string } | undefined;

// Updates the SLA policy for future requests only. Requests already
// submitted keep the deadline computed at submission time (FIG. 1 /
// FIG. 5) — changing the policy must never silently move an in-flight
// request's clock.
export async function updateServiceTypeSla(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession(["admin"]);

  const parsed = slaConfigSchema.safeParse({
    serviceTypeId: formData.get("serviceTypeId"),
    slaDays: formData.get("slaDays"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  await prisma.serviceType.update({
    where: { id: parsed.data.serviceTypeId },
    data: { slaDays: parsed.data.slaDays },
  });

  revalidatePath("/admin/service-types");
  revalidatePath("/");
}
