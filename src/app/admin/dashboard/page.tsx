import { computeOfficerWorkload, computeServiceTypeStats } from "@/lib/stats";
import { ServicePerformancePanel } from "@/components/service-performance-panel";

export default async function AdminDashboardPage() {
  const [serviceStats, officerStats] = await Promise.all([computeServiceTypeStats(), computeOfficerWorkload()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Performance Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The same figures the public dashboard shows, plus officer-level detail.
      </p>

      <div className="mt-6">
        <ServicePerformancePanel stats={serviceStats} idPrefix="admin" />
      </div>

      <h2 className="mt-10 text-sm font-semibold text-ink">Officers</h2>
      <p className="mt-1 text-xs text-ink-soft">Counts reflect the shared queue for each officer&apos;s assigned service.</p>
      <div className="mt-3 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-raised text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Overdue</th>
              <th className="px-4 py-3">Resolved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {officerStats.map((o) => (
              <tr key={o.officerId}>
                <td className="px-4 py-3 font-medium text-ink">{o.officerName}</td>
                <td className="px-4 py-3 text-ink-soft">{o.serviceTypeName}</td>
                <td className="px-4 py-3 tabular-nums">{o.openCount}</td>
                <td className="px-4 py-3 tabular-nums">
                  {o.overdueCount > 0 ? (
                    <span className="font-semibold text-status-critical">{o.overdueCount}</span>
                  ) : (
                    o.overdueCount
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{o.resolvedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
