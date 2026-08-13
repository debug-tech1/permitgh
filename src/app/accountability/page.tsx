import Link from "next/link";
import { redirect } from "next/navigation";
import { computeServiceTypeStats } from "@/lib/stats";
import { ServicePerformancePanel } from "@/components/service-performance-panel";
import { getSession, homeRouteForRole } from "@/lib/auth";

export default async function AccountabilityPage() {
  // Same audience as the old public dashboard: anyone signed in already has
  // a role-specific home more useful than the anonymous transparency page.
  const session = await getSession();
  if (session) redirect(homeRouteForRole(session.role));

  const stats = await computeServiceTypeStats();

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-wide text-brass uppercase">Public Accountability Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">How fast is the Assembly, really?</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Every permit application gets an SLA deadline the moment it&apos;s submitted. This page shows, in
          aggregate and without any personal data, how each service is actually performing against that promise.
          No account needed.
        </p>
      </div>

      <div className="mt-8">
        <ServicePerformancePanel stats={stats} idPrefix="public" />
      </div>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-line pt-8 text-sm">
        <Link href="/register" className="rounded-sm bg-accent px-4 py-2 font-semibold text-paper hover:opacity-90">
          Submit a request
        </Link>
        <Link
          href="/login"
          className="rounded-sm border border-line px-4 py-2 font-semibold text-ink hover:border-accent hover:text-accent"
        >
          Sign in
        </Link>
        <Link href="/" className="px-4 py-2 font-semibold text-ink-soft hover:text-accent">
          ← Back to welcome page
        </Link>
      </div>
    </div>
  );
}
