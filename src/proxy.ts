import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Coarse-grained gate (FIG. 1's "Auth Middleware" box): redirects unauthenticated
// or wrong-role visitors before a protected page ever renders. This is not the
// only check — every Server Action re-verifies the session independently,
// because Server Functions bypass proxy matchers entirely (see lib/auth.ts).
const SESSION_COOKIE = "servetrack_session";

const ROLE_PREFIXES: Record<string, string> = {
  "/citizen": "citizen",
  "/officer": "officer",
  "/admin": "admin",
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const requiredRole = ROLE_PREFIXES[matchedPrefix];
    if (payload.role !== requiredRole) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/citizen/:path*", "/officer/:path*", "/admin/:path*"],
};
