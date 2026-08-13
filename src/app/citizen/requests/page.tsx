import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isOverdue } from "@/lib/sla";
import { formatFee } from "@/lib/format";
import { StatusBadge, OverdueBadge } from "@/components/status-badge";
import { CitizenTabs } from "@/components/citizen/citizen-tabs";

export default async function MyRequestsPage() {
  const session = await getSession();
  if (!session) return null; // proxy already guarantees this; defensive only

  const requests = await prisma.serviceRequest.findMany({
    where: { citizenId: session.sub },
    include: { serviceType: true },
    orderBy: { submittedAt: "desc" },
  });

  const now = new Date();
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const billedUnpaidRequests = requests.filter(
    (r) => r.status !== "approved" && r.status !== "rejected" && r.feeGhs !== null && !r.paidAt,
  );
  const infoNeededRequests = requests.filter((r) => r.status === "additional_info_needed");

  return (
    <div>
      <CitizenTabs active="requests" />

      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-ink">My Requests</h1>
        <p className="mt-1 text-sm text-ink-soft">Every application you&apos;ve submitted, and where it stands.</p>
      </div>

      {(approvedRequests.length > 0 || billedUnpaidRequests.length > 0 || infoNeededRequests.length > 0) && (
        <div className="mt-6 space-y-2">
          {approvedRequests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-status-ok/40 bg-status-ok/10 px-4 py-3"
            >
              <p className="text-sm font-medium text-status-ok">Your {r.serviceType.name} was approved.</p>
              <Link
                href={`/citizen/requests/${r.id}/confirmation`}
                className="text-sm font-semibold text-status-ok hover:underline"
              >
                View confirmation →
              </Link>
            </div>
          ))}
          {billedUnpaidRequests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-status-warn/40 bg-status-warn/10 px-4 py-3"
            >
              <p className="text-sm font-medium text-status-warn">
                Your {r.serviceType.name} has been billed: {r.feeGhs !== null ? formatFee(r.feeGhs) : ""} — payment
                due.
              </p>
              <Link
                href={`/citizen/requests/${r.id}`}
                className="text-sm font-semibold text-status-warn hover:underline"
              >
                View details →
              </Link>
            </div>
          ))}
          {infoNeededRequests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-status-critical/40 bg-status-critical/10 px-4 py-3"
            >
              <p className="text-sm font-medium text-status-critical">
                Your {r.serviceType.name} needs more information.
              </p>
              <Link
                href={`/citizen/requests/${r.id}`}
                className="text-sm font-semibold text-status-critical hover:underline"
              >
                Complete it →
              </Link>
            </div>
          ))}
        </div>
      )}

      {requests.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">You haven&apos;t submitted any requests yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line">
          {requests.map((r) => {
            const overdue = isOverdue(now, r.slaDeadline, r.status);
            return (
              <li key={r.id}>
                <Link
                  href={`/citizen/requests/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-paper-raised"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.serviceType.name}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Submitted {r.submittedAt.toLocaleDateString()} &middot; SLA deadline{" "}
                      {r.slaDeadline.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && <OverdueBadge />}
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
