import type { ServiceTypeStats } from "@/lib/stats";

type Tone = "ok" | "warn" | "critical" | "neutral";

const TONE_CLASSES: Record<Tone, { text: string; track: string; fill: string }> = {
  ok: { text: "text-status-ok", track: "bg-status-ok/15", fill: "bg-status-ok" },
  warn: { text: "text-status-warn", track: "bg-status-warn/15", fill: "bg-status-warn" },
  critical: { text: "text-status-critical", track: "bg-status-critical/15", fill: "bg-status-critical" },
  neutral: { text: "text-ink-soft", track: "bg-ink-soft/10", fill: "bg-ink-soft" },
};

function toneForPercent(pct: number | null): Tone {
  if (pct === null) return "neutral";
  if (pct >= 80) return "ok";
  if (pct >= 50) return "warn";
  return "critical";
}

function StatusIcon({ tone }: { tone: Tone }) {
  const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (tone === "ok") {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5 10.8 15.3 16 9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "warn") {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.2">
        <path d="M12 3.5 22 20.5H2Z" strokeLinejoin="round" />
        <path d="M12 10v4" strokeLinecap="round" />
        <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (tone === "critical") {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

function StatTile({ label, value, warnWhenPositive }: { label: string; value: number; warnWhenPositive?: boolean }) {
  const alert = Boolean(warnWhenPositive && value > 0);
  return (
    <div className="border border-line bg-paper-raised p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p
        className={`mt-1 flex items-center gap-1.5 text-2xl font-semibold ${alert ? "text-status-critical" : "text-ink"}`}
      >
        {alert && <StatusIcon tone="critical" />}
        {value}
      </p>
    </div>
  );
}

function Meter({ stats }: { stats: ServiceTypeStats }) {
  const tone = toneForPercent(stats.withinSlaPercent);
  const { text, track, fill } = TONE_CLASSES[tone];
  const pct = stats.withinSlaPercent ?? 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 font-semibold ${text}`}>
          <StatusIcon tone={tone} />
          {stats.withinSlaPercent !== null ? `${stats.withinSlaPercent}%` : "No cases resolved yet"}
        </span>
        {stats.withinSlaPercent !== null && <span className="text-ink-soft">resolved within SLA</span>}
      </div>
      <div className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${track}`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ServiceCard({ stats }: { stats: ServiceTypeStats }) {
  return (
    <article className="border border-line bg-paper-raised p-5">
      <h3 className="text-sm font-semibold text-ink">{stats.serviceTypeName}</h3>
      <p className="text-xs text-ink-soft">{stats.slaDays}-day SLA</p>

      <div className="mt-4">
        <Meter stats={stats} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-xs">
        <div>
          <dt className="text-ink-soft">Open</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular-nums">{stats.openRequests}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Overdue</dt>
          <dd
            className={`mt-0.5 font-semibold tabular-nums ${stats.overdueOpenCount > 0 ? "text-status-critical" : "text-ink"}`}
          >
            {stats.overdueOpenCount}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft">Avg. days</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular-nums">{stats.avgResolutionDays ?? "—"}</dd>
        </div>
      </dl>
    </article>
  );
}

/**
 * KPI row + per-service meter cards, with a native <details> disclosure for
 * a plain table underneath — the accessibility twin every chart-like view
 * needs, with no client JS. Shared by the public accountability dashboard
 * and the admin performance view so the two can never visually or
 * numerically drift apart.
 */
export function ServicePerformancePanel({ stats, idPrefix }: { stats: ServiceTypeStats[]; idPrefix: string }) {
  const totals = stats.reduce(
    (acc, s) => ({
      open: acc.open + s.openRequests,
      overdue: acc.overdue + s.overdueOpenCount,
      resolved: acc.resolved + s.resolvedCount,
    }),
    { open: 0, overdue: 0, resolved: 0 },
  );
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Open requests" value={totals.open} />
        <StatTile label="Currently overdue" value={totals.overdue} warnWhenPositive />
        <StatTile label="Resolved to date" value={totals.resolved} />
      </div>

      <h2 className="mt-6 text-xs font-semibold tracking-wide text-ink-soft uppercase">By service</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <ServiceCard key={s.serviceTypeId} stats={s} />
        ))}
      </div>

      {/* Native <details> — the accessibility twin every chart-like view
          needs, with no custom JS or CSS-selector wiring required. */}
      <details className="group mt-4" id={`${idPrefix}-table`}>
        <summary className="w-fit cursor-pointer text-xs font-semibold text-accent select-none hover:underline">
          <span className="group-open:hidden">View as table</span>
          <span className="hidden group-open:inline">Hide table</span>
        </summary>
        <div className="mt-3 overflow-x-auto border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-raised text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Overdue</th>
              <th className="px-4 py-3">Resolved</th>
              <th className="px-4 py-3">Avg. resolution</th>
              <th className="px-4 py-3">% within SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((s) => (
              <tr key={s.serviceTypeId}>
                <td className="px-4 py-3 font-medium text-ink">{s.serviceTypeName}</td>
                <td className="px-4 py-3 text-ink-soft tabular-nums">{s.slaDays}d</td>
                <td className="px-4 py-3 tabular-nums">{s.openRequests}</td>
                <td className="px-4 py-3 tabular-nums">
                  {s.overdueOpenCount > 0 ? (
                    <span className="font-semibold text-status-critical">{s.overdueOpenCount}</span>
                  ) : (
                    s.overdueOpenCount
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{s.resolvedCount}</td>
                <td className="px-4 py-3 tabular-nums">
                  {s.avgResolutionDays !== null ? `${s.avgResolutionDays}d` : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.withinSlaPercent !== null ? `${s.withinSlaPercent}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>
    </div>
  );
}
