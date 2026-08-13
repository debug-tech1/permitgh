"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSessionCookie,
  destroySessionCookie,
  hashPassword,
  homeRouteForRole,
  verifyPassword,
  type Role,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";

export type ActionState = { error?: string } | undefined;

export async function registerCitizen(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "citizen" },
  });

  await createSessionCookie({ sub: user.id, role: "citizen", name: user.name, assignedServiceTypeId: null });
  redirect(homeRouteForRole("citizen"));
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  const role = user.role as Role;
  await createSessionCookie({
    sub: user.id,
    role,
    name: user.name,
    assignedServiceTypeId: user.assignedServiceTypeId,
  });
  redirect(homeRouteForRole(role));
}

export async function logout() {
  await destroySessionCookie();
  redirect("/");
}
