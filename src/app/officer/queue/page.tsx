import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isOverdue, isTerminalStatus, NEXT_STATUSES, REQUEST_STATUSES, STATUS_LABELS, type RequestStatus } from "@/lib/sla";
import { StatusBadge, OverdueBadge } from "@/components/status-badge";
import { UpdateStatusForm } from "@/components/officer/update-status-form";

export default async function OfficerQueuePage({ searchParams }: PageProps<"/officer/queue">) {
  const session = await getSession();
  if (!session || !session.assignedServiceTypeId) return null;

  const sp = await searchParams;
  const statusFilter = typeof sp.status === "string" && sp.status.length > 0 ? sp.status : undefined;
  const overdueOnly = sp.overdue === "1";

  const [serviceType, requests] = await Promise.all([
    prisma.serviceType.findUnique({ where: { id: session.assignedServiceTypeId } }),
    prisma.serviceRequest.findMany({
      where: {
        serviceTypeId: session.assignedServiceTypeId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: { citizen: true },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  const now = new Date();
  const visible = overdueOnly ? requests.filter((r) => isOverdue(now, r.slaDeadline, r.status)) : requests;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">My Queue</h1>
      <p className="mt-1 text-sm text-ink-soft">Requests assigned to {serviceType?.name ?? "your service type"}.</p>

      <form className="mt-6 flex flex-wrap items-end gap-4 border border-line bg-paper-raised p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs tracking-wide text-ink-soft uppercase">Status</span>
          <select name="status" defaultValue={statusFilter ?? ""} className="border border-line bg-paper px-2 py-1.5 text-ink">
            <option value="">All</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2">
          <input type="checkbox" name="overdue" value="1" defaultChecked={overdueOnly} />
          <span className="text-ink">Overdue only</span>
        </label>
        <button type="submit" className="rounded-sm bg-accent px-4 py-1.5 font-semibold text-paper hover:opacity-90">
          Apply
        </button>
        {(statusFilter || overdueOnly) && (
          <Link href="/officer/queue" className="pb-2 text-xs text-ink-soft hover:text-accent">
            Clear filters
          </Link>
        )}
      </form>

      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">Nothing here.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((r) => {
            const overdue = isOverdue(now, r.slaDeadline, r.status);
            return (
              <li key={r.id} className="border border-line bg-paper-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.citizen.name}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Submitted {r.submittedAt.toLocaleDateString()} &middot; SLA deadline{" "}
                      {r.slaDeadline.toLocaleDateString()}
                    </p>
                    <p className="mt-2 max-w-lg text-sm text-ink">{r.applicantNote}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && <OverdueBadge />}
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                {!isTerminalStatus(r.status) && (
                  <div className="mt-4 border-t border-line pt-4">
                    <UpdateStatusForm requestId={r.id} nextStatuses={NEXT_STATUSES[r.status as RequestStatus] ?? []} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
