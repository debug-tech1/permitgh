import "server-only";
import { prisma } from "@/lib/db";
import { daysBetween, isOverdue } from "@/lib/sla";

// Shared by the public accountability dashboard (FIG. "Public Accountability
// Dashboard" — no PII) and the admin performance view (adds officer detail).
// Kept in one place so the two pages can never silently drift apart on how
// "resolved within SLA" is defined.

export type ServiceTypeStats = {
  serviceTypeId: string;
  serviceTypeName: string;
  slaDays: number;
  totalRequests: number;
  openRequests: number;
  overdueOpenCount: number;
  resolvedCount: number;
  avgResolutionDays: number | null;
  withinSlaPercent: number | null;
};

export async function computeServiceTypeStats(): Promise<ServiceTypeStats[]> {
  const serviceTypes = await prisma.serviceType.findMany({
    include: { requests: true },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  return serviceTypes.map((st) => {
    const resolved = st.requests.filter((r) => r.resolvedAt);
    const open = st.requests.filter((r) => !r.resolvedAt);
    const overdueOpen = open.filter((r) => isOverdue(now, r.slaDeadline, r.status));
    const withinSla = resolved.filter((r) => r.resolvedAt! <= r.slaDeadline);

    const avgResolutionDays =
      resolved.length > 0
        ? Math.round(
            (resolved.reduce((sum, r) => sum + daysBetween(r.submittedAt, r.resolvedAt!), 0) / resolved.length) * 10,
          ) / 10
        : null;

    return {
      serviceTypeId: st.id,
      serviceTypeName: st.name,
      slaDays: st.slaDays,
      totalRequests: st.requests.length,
      openRequests: open.length,
      overdueOpenCount: overdueOpen.length,
      resolvedCount: resolved.length,
      avgResolutionDays,
      withinSlaPercent: resolved.length > 0 ? Math.round((withinSla.length / resolved.length) * 100) : null,
    };
  });
}

// The nav bar's notification bell — count of a citizen's requests that need
// them to actually do something (upload docs, or pay a bill), not just
// requests in progress generally. Deliberately excludes "approved", which
// already gets a prominent banner and isn't an outstanding action.
export async function countCitizenActionableRequests(citizenId: string): Promise<number> {
  return prisma.serviceRequest.count({
    where: {
      citizenId,
      status: { notIn: ["approved", "rejected"] },
      OR: [{ status: "additional_info_needed" }, { AND: [{ feeGhs: { not: null } }, { paidAt: null }] }],
    },
  });
}

export type OfficerWorkload = {
  officerId: string;
  officerName: string;
  serviceTypeName: string;
  openCount: number;
  overdueCount: number;
  resolvedCount: number;
};

// Officers share a single queue per service type (there's no per-request
// officer assignment in the schema — see FIG. 3), so these counts describe
// the officer's queue, not individually-attributed casework.
export async function computeOfficerWorkload(): Promise<OfficerWorkload[]> {
  const officers = await prisma.user.findMany({
    where: { role: "officer" },
    include: { assignedServiceType: { include: { requests: true } } },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  return officers.map((o) => {
    const requests = o.assignedServiceType?.requests ?? [];
    const open = requests.filter((r) => !r.resolvedAt);
    const overdue = open.filter((r) => isOverdue(now, r.slaDeadline, r.status));
    return {
      officerId: o.id,
      officerName: o.name,
      serviceTypeName: o.assignedServiceType?.name ?? "Unassigned",
      openCount: open.length,
      overdueCount: overdue.length,
      resolvedCount: requests.length - open.length,
    };
  });
}
