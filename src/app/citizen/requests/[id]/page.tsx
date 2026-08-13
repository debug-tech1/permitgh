import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isOverdue, STATUS_LABELS, type RequestStatus } from "@/lib/sla";
import { formatFee } from "@/lib/format";
import { StatusBadge, OverdueBadge } from "@/components/status-badge";
import { AddAttachmentsForm } from "@/components/citizen/add-attachments-form";

export default async function RequestDetailPage({ params }: PageProps<"/citizen/requests/[id]">) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      serviceType: true,
      attachments: true,
      history: { orderBy: { changedAt: "asc" }, include: { changedBy: true } },
    },
  });

  if (!request || request.citizenId !== session.sub) {
    notFound();
  }

  const overdue = isOverdue(new Date(), request.slaDeadline, request.status);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{request.serviceType.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">Submitted {request.submittedAt.toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {overdue && <OverdueBadge />}
          <StatusBadge status={request.status} />
        </div>
      </div>

      {request.status === "approved" && (
        <div className="mt-4 flex items-center justify-between border border-status-ok/40 bg-status-ok/10 px-4 py-3">
          <p className="text-sm font-medium text-status-ok">Approved — your confirmation is ready.</p>
          <Link
            href={`/citizen/requests/${request.id}/confirmation`}
            className="text-sm font-semibold text-status-ok hover:underline"
          >
            View confirmation →
          </Link>
        </div>
      )}

      {request.status !== "approved" && request.status !== "rejected" && request.feeGhs !== null && !request.paidAt && (
        <div className="mt-4 border border-status-warn/40 bg-status-warn/10 px-4 py-3">
          <p className="text-sm font-medium text-status-warn">
            Billed: {request.billingDetail ?? formatFee(request.feeGhs)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Arrange payment with the Assembly through their existing channels — ServeTrack doesn&apos;t collect
            payment. Your officer can move this request toward approval once payment is confirmed.
          </p>
        </div>
      )}

      {request.status === "additional_info_needed" && (
        <div className="mt-4 border border-status-critical/40 bg-status-critical/10 px-4 py-3">
          <p className="text-sm font-medium text-status-critical">More information is needed on this request.</p>
          {request.history.at(-1)?.remark && (
            <p className="mt-1 text-sm text-ink">{request.history.at(-1)?.remark}</p>
          )}
          <p className="mt-1 text-xs text-ink-soft">
            Review the required documents list below and add whatever&apos;s missing.
          </p>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 border border-line bg-paper-raised p-4 text-sm">
        <div>
          <dt className="text-xs tracking-wide text-ink-soft uppercase">SLA deadline</dt>
          <dd className="mt-1 font-medium text-ink">{request.slaDeadline.toLocaleDateString()}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-ink-soft uppercase">Resolved</dt>
          <dd className="mt-1 font-medium text-ink">
            {request.resolvedAt ? request.resolvedAt.toLocaleDateString() : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs tracking-wide text-ink-soft uppercase">Fee</dt>
          <dd className="mt-1 font-medium text-ink">
            {request.feeGhs !== null ? (
              <>
                {request.billingDetail ?? formatFee(request.feeGhs)}
                {" — "}
                {request.paidAt ? (
                  <span className="text-status-ok">paid {request.paidAt.toLocaleDateString()}</span>
                ) : (
                  <span className="text-status-warn">payment due</span>
                )}
              </>
            ) : (
              <span className="text-brass">Not yet billed</span>
            )}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs tracking-wide text-ink-soft uppercase">Your note</dt>
          <dd className="mt-1 text-ink">{request.applicantNote}</dd>
        </div>
      </dl>

      {(request.attachments.length > 0 || request.status === "additional_info_needed") && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Attachments</h2>
          {request.attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {request.attachments.map((a) => (
                <li key={a.id}>
                  <a href={a.fileUrl} download={a.fileName} className="text-sm text-accent hover:underline">
                    {a.fileName}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {request.status === "additional_info_needed" && (
            <>
              {request.serviceType.requiredDocuments.length > 0 && (
                <p className="mt-2 text-xs text-ink-soft">
                  Required for {request.serviceType.name}: {request.serviceType.requiredDocuments.join(", ")}
                </p>
              )}
              <AddAttachmentsForm requestId={request.id} />
            </>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Status timeline</h2>
        <ol className="mt-3 space-y-4 border-l border-line pl-4">
          {request.history.map((h) => (
            <li key={h.id}>
              <p className="text-sm font-semibold text-ink">
                {STATUS_LABELS[h.status as RequestStatus] ?? h.status}
              </p>
              <p className="text-xs text-ink-soft">
                {h.changedAt.toLocaleString()} &middot; {h.changedBy.name}
              </p>
              {h.remark && <p className="mt-1 text-sm text-ink">{h.remark}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
