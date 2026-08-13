import "server-only";
import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/sla";

// A reporting period is defined by submittedAt — "requests received in this
// window" is the natural framing for an operational report. Omit either
// bound for an open-ended range; omit both for all-time.
export type ReportPeriod = { from?: Date; to?: Date };

export function parseDateParam(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export type ServiceReportRow = {
  serviceTypeId: string;
  serviceTypeName: string;
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  feesBilledGhs: number;
  feesCollectedGhs: number;
  waivedGhs: number;
  avgResolutionDays: number | null;
  withinSlaPercent: number | null;
};

export type ReportSummary = {
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  feesBilledGhs: number;
  feesCollectedGhs: number;
  waivedGhs: number;
  withinSlaPercent: number | null;
  rows: ServiceReportRow[];
};

export async function computeReport(period: ReportPeriod): Promise<ReportSummary> {
  const submittedAtFilter =
    period.from || period.to
      ? { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) }
      : undefined;

  const serviceTypes = await prisma.serviceType.findMany({
    include: { requests: { where: submittedAtFilter ? { submittedAt: submittedAtFilter } : undefined } },
    orderBy: { name: "asc" },
  });

  const rows: ServiceReportRow[] = serviceTypes.map((st) => {
    const approved = st.requests.filter((r) => r.status === "approved");
    const rejected = st.requests.filter((r) => r.status === "rejected");
    const resolved = st.requests.filter((r) => r.resolvedAt);
    const withinSla = resolved.filter((r) => r.resolvedAt! <= r.slaDeadline);
    const feesBilledGhs = st.requests.reduce((sum, r) => sum + (r.feeGhs ?? 0), 0);
    const feesCollectedGhs = st.requests.filter((r) => r.paidAt).reduce((sum, r) => sum + (r.feeGhs ?? 0), 0);
    const waivedGhs = st.requests.reduce((sum, r) => sum + r.waiverGhs, 0);
    const avgResolutionDays =
      resolved.length > 0
        ? Math.round(
            (resolved.reduce((sum, r) => sum + daysBetween(r.submittedAt, r.resolvedAt!), 0) / resolved.length) * 10,
          ) / 10
        : null;

    return {
      serviceTypeId: st.id,
      serviceTypeName: st.name,
      totalRequests: st.requests.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      feesBilledGhs,
      feesCollectedGhs,
      waivedGhs,
      avgResolutionDays,
      withinSlaPercent: resolved.length > 0 ? Math.round((withinSla.length / resolved.length) * 100) : null,
    };
  });

  const totalResolved = rows.reduce((sum, r) => sum + r.approvedCount + r.rejectedCount, 0);
  const totalWithinSlaCount = serviceTypes
    .flatMap((st) => st.requests)
    .filter((r) => r.resolvedAt && r.resolvedAt <= r.slaDeadline).length;

  return {
    totalRequests: rows.reduce((sum, r) => sum + r.totalRequests, 0),
    approvedCount: rows.reduce((sum, r) => sum + r.approvedCount, 0),
    rejectedCount: rows.reduce((sum, r) => sum + r.rejectedCount, 0),
    feesBilledGhs: rows.reduce((sum, r) => sum + r.feesBilledGhs, 0),
    feesCollectedGhs: rows.reduce((sum, r) => sum + r.feesCollectedGhs, 0),
    waivedGhs: rows.reduce((sum, r) => sum + r.waivedGhs, 0),
    withinSlaPercent: totalResolved > 0 ? Math.round((totalWithinSlaCount / totalResolved) * 100) : null,
    rows,
  };
}
