import Link from "next/link";
import { computeServiceTypeStats } from "@/lib/stats";

export default async function PublicDashboardPage() {
  const stats = await computeServiceTypeStats();

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-wide text-brass uppercase">Public Accountability Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">How fast is the Assembly, really?</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Every permit application gets an SLA deadline the moment it&apos;s submitted. This page shows, in
          aggregate and without any personal data, how each service is actually performing against that promise —
          no account needed.
        </p>
      </div>

      <div className="mt-8 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-raised text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Open now</th>
              <th className="px-4 py-3">Currently overdue</th>
              <th className="px-4 py-3">Avg. resolution</th>
              <th className="px-4 py-3">% resolved within SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((s) => (
              <tr key={s.serviceTypeId}>
                <td className="px-4 py-3 font-medium text-ink">{s.serviceTypeName}</td>
                <td className="px-4 py-3 text-ink-soft tabular-nums">{s.slaDays} days</td>
                <td className="px-4 py-3 tabular-nums">{s.openRequests}</td>
                <td className="px-4 py-3 tabular-nums">
                  {s.overdueOpenCount > 0 ? (
                    <span className="font-semibold text-status-critical">{s.overdueOpenCount}</span>
                  ) : (
                    <span className="text-status-ok">0</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.avgResolutionDays !== null ? `${s.avgResolutionDays} days` : "No cases resolved yet"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.withinSlaPercent !== null ? (
                    <span
                      className={
                        s.withinSlaPercent >= 80
                          ? "text-status-ok"
                          : s.withinSlaPercent >= 50
                            ? "text-status-warn"
                            : "text-status-critical"
                      }
                    >
                      {s.withinSlaPercent}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      </div>
    </div>
  );
}
