import Link from "next/link";
import { getSession, type Role } from "@/lib/auth";
import { logout } from "@/actions/auth-actions";
import { countCitizenActionableRequests } from "@/lib/stats";

const NAV_LINKS: Record<Role, { href: string; label: string }[]> = {
  citizen: [
    { href: "/citizen/requests", label: "My Requests" },
    { href: "/citizen/requests/new", label: "New Request" },
  ],
  officer: [{ href: "/officer/queue", label: "My Queue" }],
  admin: [
    { href: "/admin/dashboard", label: "Performance" },
    { href: "/admin/service-types", label: "Service Types" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/reports", label: "Reports" },
  ],
};

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function NotificationBell({ citizenId }: { citizenId: string }) {
  const count = await countCitizenActionableRequests(citizenId);
  return (
    <Link
      href="/citizen/requests"
      className="relative text-ink-soft hover:text-accent"
      aria-label={count > 0 ? `${count} request${count === 1 ? "" : "s"} need your attention` : "No updates"}
    >
      <BellIcon />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-bold text-paper">
          {count}
        </span>
      )}
    </Link>
  );
}

export async function NavBar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold text-ink">
          PermitGH
        </Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm">
          {session &&
            NAV_LINKS[session.role].map((link) => (
              <Link key={link.href} href={link.href} className="font-medium text-ink-soft hover:text-accent">
                {link.label}
              </Link>
            ))}
          {session?.role === "citizen" && <NotificationBell citizenId={session.sub} />}
          {session ? (
            <div className="flex items-center gap-3 border-l border-line pl-5">
              <span className="text-xs text-ink-soft">
                {session.name}{" "}
                <span className="font-semibold tracking-wide text-brass uppercase">&middot; {session.role}</span>
              </span>
              <form action={logout}>
                <button type="submit" className="text-sm font-semibold text-accent hover:underline">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-line pl-5">
              <Link href="/login" className="font-medium text-ink-soft hover:text-accent">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-sm bg-accent px-3 py-1.5 font-semibold text-paper hover:opacity-90"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
