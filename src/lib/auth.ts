import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const SESSION_COOKIE = "servetrack_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = "citizen" | "officer" | "admin";

export type SessionPayload = {
  sub: string;
  role: Role;
  name: string;
  assignedServiceTypeId: string | null;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set — check your .env file");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Ambiguous characters (0/O, 1/I/l) left out so a temp password read aloud
// over the phone doesn't get mistyped — an admin resetting a citizen's
// password has to relay it through the Assembly's own channels, not email.
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}

/** Sets the session cookie. Only callable from a Server Action or Route Handler. */
export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clears the session cookie. Only callable from a Server Action or Route Handler. */
export async function destroySessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Defense-in-depth check for every Server Action, independent of proxy.ts.
 * Proxy routing can be bypassed by calling a Server Function directly, so
 * every mutation re-checks identity and role here — see the Server Actions
 * security note this project follows (Next.js data-security guide).
 */
export async function requireSession(roles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("You must be signed in.");
  if (roles && !roles.includes(session.role)) {
    throw new AuthError("You do not have permission to do that.");
  }
  return session;
}

export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "citizen":
      return "/citizen/requests";
    case "officer":
      return "/officer/queue";
    case "admin":
      return "/admin/dashboard";
  }
}
