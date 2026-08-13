import Link from "next/link";
import { prisma } from "@/lib/db";
import { computeOfficerWorkload, computeServiceTypeStats } from "@/lib/stats";
import { daysBetween, REQUEST_STATUSES, STATUS_LABELS, type RequestStatus } from "@/lib/sla";
import { referenceNumber } from "@/lib/format";

// Light-background-tuned shades (600/700 weight reads clearly on white;
// the old dark-console version used 300/400 pastels that were only
// legible against near-black). "under_review" gets its own amber now
// instead of reusing the console's green accent, which would otherwise be
// indistinguishable from "approved".
const STATUS_STYLES: Record<RequestStatus, { text: string; dot: string; bg: string }> = {
  received: { text: "text-slate-600", dot: "bg-slate-500", bg: "bg-slate-500/10" },
  under_review: { text: "text-amber-700", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  additional_info_needed: { text: "text-sky-700", dot: "bg-sky-500", bg: "bg-sky-500/10" },
  approved: { text: "text-emerald-700", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
  rejected: { text: "text-rose-700", dot: "bg-rose-500", bg: "bg-rose-500/10" },
};

function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function KpiCard({ label, value, critical }: { label: string; value: string | number; critical?: boolean }) {
  return (
    <div className="border border-[var(--console-border)] bg-[var(--console-card)] p-4">
      <p className="text-[11px] tracking-wide text-[var(--console-ink-soft)] uppercase">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${critical ? "text-rose-600" : "text-[var(--console-ink)]"}`}>{value}</p>
    </div>
  );
}

function ServiceIcon({ serviceTypeName }: { serviceTypeName: string }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (serviceTypeName.includes("Building")) {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
        <path d="M10 21v-3h4v3" />
      </svg>
    );
  }
  if (serviceTypeName.includes("Market") || serviceTypeName.includes("Stall")) {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1-5h16l1 5" />
        <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
        <path d="M5 9v10h14V9" />
        <path d="M10 19v-6h4v6" />
      </svg>
    );
  }
  return (
    <svg {...common} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="1.5" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

export default async function AdminDashboardPage() {
  const [serviceStats, officerStats, recentRequests, statusCounts, resolvedDurations] = await Promise.all([
    computeServiceTypeStats(),
    computeOfficerWorkload(),
    prisma.serviceRequest.findMany({
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: { citizen: true, serviceType: true },
    }),
    prisma.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.serviceRequest.findMany({
      where: { resolvedAt: { not: null } },
      select: { submittedAt: true, resolvedAt: true },
    }),
  ]);

  const totals = serviceStats.reduce(
    (acc, s) => ({
      open: acc.open + s.openRequests,
      overdue: acc.overdue + s.overdueOpenCount,
      resolved: acc.resolved + s.resolvedCount,
    }),
    { open: 0, overdue: 0, resolved: 0 },
  );

  const avgProcessing =
    resolvedDurations.length > 0
      ? Math.round(
          (resolvedDurations.reduce((sum, r) => sum + daysBetween(r.submittedAt, r.resolvedAt!), 0) /
            resolvedDurations.length) *
            10,
        ) / 10
      : null;

  const statusCountMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])) as Record<
    string,
    number
  >;
  const maxStatusCount = Math.max(1, ...REQUEST_STATUSES.map((s) => statusCountMap[s] ?? 0));

  const overdueAdvisories = serviceStats
    .filter((s) => s.overdueOpenCount > 0)
    .map((s) => `${s.overdueOpenCount} request${s.overdueOpenCount > 1 ? "s" : ""} overdue in ${s.serviceTypeName}`);

  return (
    <div className="ops-console border border-[var(--console-border)] bg-[var(--console-bg)] p-6 text-[var(--console-ink)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--console-gold)] uppercase">
            Operations Overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--console-ink)]">Permitting Dashboard</h1>
        </div>
        <div className="text-right text-xs text-[var(--console-ink-soft)]">
          <p>Last updated {new Date().toLocaleString()}</p>
          <p>PermitGH, Municipal Assembly</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Open requests" value={totals.open} />
        <KpiCard label="Currently overdue" value={totals.overdue} critical={totals.overdue > 0} />
        <KpiCard label="Avg. processing" value={avgProcessing !== null ? `${avgProcessing}d` : "N/A"} />
        <KpiCard label="Resolved to date" value={totals.resolved} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {serviceStats.map((s) => (
          <div
            key={s.serviceTypeId}
            className="flex items-center justify-between border border-[var(--console-border)] bg-[var(--console-card)] p-4"
          >
            <div>
              <p className="text-[11px] tracking-wide text-[var(--console-ink-soft)] uppercase">
                {s.serviceTypeName}
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--console-gold)]">{s.openRequests}</p>
              <p className="text-[11px] text-[var(--console-ink-soft)]">active applications</p>
            </div>
            <div className="text-[var(--console-gold)]">
              <ServiceIcon serviceTypeName={s.serviceTypeName} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-[var(--console-border)] bg-[var(--console-card)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--console-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--console-ink)]">Recent Applications</h2>
            <Link href="/officer/queue" className="text-xs font-semibold text-[var(--console-gold)] hover:underline">
              View queue →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-wide text-[var(--console-ink-soft)] uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Ref. No.</th>
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Applicant</th>
                  <th className="px-4 py-2 font-medium">Filed</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--console-border)]">
                {recentRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--console-gold)]">
                      {referenceNumber(r.id)}
                    </td>
                    <td className="px-4 py-3 text-[var(--console-ink)]">{r.serviceType.name}</td>
                    <td className="px-4 py-3 text-[var(--console-ink-soft)]">{r.citizen.name}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--console-ink-soft)]">
                      {r.submittedAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status as RequestStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-[var(--console-border)] bg-[var(--console-card)] p-4">
            <h2 className="text-sm font-semibold text-[var(--console-ink)]">Status Breakdown</h2>
            <div className="mt-3 space-y-3">
              {REQUEST_STATUSES.map((s) => {
                const count = statusCountMap[s] ?? 0;
                const pct = Math.round((count / maxStatusCount) * 100);
                const style = STATUS_STYLES[s];
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--console-ink-soft)]">{STATUS_LABELS[s]}</span>
                      <span className="font-semibold text-[var(--console-ink)] tabular-nums">{count}</span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-[var(--console-border)]">
                      <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-[var(--console-border)] bg-[var(--console-card)] p-4">
            <h2 className="text-sm font-semibold text-[var(--console-ink)]">Officer Queues</h2>
            <div className="mt-3 space-y-2.5 text-xs">
              {officerStats.map((o) => (
                <div key={o.officerId} className="flex items-center justify-between">
                  <span className="text-[var(--console-ink-soft)]">{o.officerName}</span>
                  <span className="tabular-nums text-[var(--console-ink)]">
                    {o.openCount} open
                    {o.overdueCount > 0 && <span className="ml-1 text-rose-600">&middot; {o.overdueCount} overdue</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[var(--console-border)] bg-[var(--console-card)] p-4">
            <h2 className="text-sm font-semibold text-[var(--console-ink)]">Advisories</h2>
            <ul className="mt-3 space-y-2 text-xs text-[var(--console-ink-soft)]">
              {overdueAdvisories.map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-rose-600" />
                  {text}
                </li>
              ))}
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[var(--console-gold)]" />
                Required-document checklists published for all services
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-emerald-600" />
                PermitGH platform operational
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
