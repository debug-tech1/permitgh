import Link from "next/link";
import { computeReport, parseDateParam } from "@/lib/reports";
import { formatFee } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-line bg-paper-raised p-4">
      <p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const fromParam = typeof sp.from === "string" ? sp.from : "";
  const toParam = typeof sp.to === "string" ? sp.to : "";
  const from = parseDateParam(fromParam);
  const to = parseDateParam(toParam, true);

  const report = await computeReport({ from, to });
  const exportHref = `/admin/reports/export${fromParam || toParam ? `?from=${fromParam}&to=${toParam}` : ""}`;

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {from || to ? "Requests submitted in the selected period." : "All requests, all time."}
          </p>
        </div>
      </div>

      <form className="no-print mt-6 flex flex-wrap items-end gap-4 border border-line bg-paper-raised p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs tracking-wide text-ink-soft uppercase">From</span>
          <input
            type="date"
            name="from"
            defaultValue={fromParam}
            className="border border-line bg-paper px-2 py-1.5 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs tracking-wide text-ink-soft uppercase">To</span>
          <input
            type="date"
            name="to"
            defaultValue={toParam}
            className="border border-line bg-paper px-2 py-1.5 text-ink"
          />
        </label>
        <button type="submit" className="rounded-sm bg-accent px-4 py-1.5 font-semibold text-paper hover:opacity-90">
          Apply
        </button>
        {(fromParam || toParam) && (
          <Link href="/admin/reports" className="pb-2 text-xs text-ink-soft hover:text-accent">
            Clear
          </Link>
        )}
        <a
          href={exportHref}
          className="ml-auto rounded-sm border border-line px-4 py-1.5 font-semibold text-ink hover:border-accent hover:text-accent"
        >
          Download CSV
        </a>
      </form>

      <div className="mt-8">
        <p className="font-display text-lg font-semibold text-ink">PermitGH: Operations Report</p>
        <p className="text-xs text-ink-soft">
          {from ? from.toLocaleDateString() : "Start"} – {to ? to.toLocaleDateString() : "Present"} &middot;
          Generated {new Date().toLocaleString()}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total requests" value={report.totalRequests} />
          <StatTile label="Approved" value={report.approvedCount} />
          <StatTile label="Rejected" value={report.rejectedCount} />
          <StatTile label="Within SLA" value={report.withinSlaPercent !== null ? `${report.withinSlaPercent}%` : "N/A"} />
          <StatTile label="Fees billed" value={formatFee(report.feesBilledGhs)} />
          <StatTile label="Fees collected" value={formatFee(report.feesCollectedGhs)} />
          <StatTile label="Waived" value={formatFee(report.waivedGhs)} />
          <StatTile
            label="Collection rate"
            value={report.feesBilledGhs > 0 ? `${Math.round((report.feesCollectedGhs / report.feesBilledGhs) * 100)}%` : "N/A"}
          />
        </div>

        <div className="mt-6 overflow-x-auto border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-raised text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Requests</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Rejected</th>
                <th className="px-4 py-3">Billed</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Waived</th>
                <th className="px-4 py-3">Avg. resolution</th>
                <th className="px-4 py-3">% within SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.rows.map((r) => (
                <tr key={r.serviceTypeId}>
                  <td className="px-4 py-3 font-medium text-ink">{r.serviceTypeName}</td>
                  <td className="px-4 py-3 tabular-nums">{r.totalRequests}</td>
                  <td className="px-4 py-3 tabular-nums">{r.approvedCount}</td>
                  <td className="px-4 py-3 tabular-nums">{r.rejectedCount}</td>
                  <td className="px-4 py-3 tabular-nums">{formatFee(r.feesBilledGhs)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatFee(r.feesCollectedGhs)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatFee(r.waivedGhs)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.avgResolutionDays !== null ? `${r.avgResolutionDays}d` : "N/A"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.withinSlaPercent !== null ? `${r.withinSlaPercent}%` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="no-print mt-6 flex justify-start">
        <PrintButton />
      </div>
    </div>
  );
}
