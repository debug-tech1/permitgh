import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatFee, referenceNumber } from "@/lib/format";
import { PrintButton } from "@/components/citizen/print-button";

export default async function ApprovalConfirmationPage({ params }: PageProps<"/citizen/requests/[id]/confirmation">) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      serviceType: true,
      citizen: true,
      history: { orderBy: { changedAt: "asc" }, include: { changedBy: true } },
    },
  });

  if (!request || request.citizenId !== session.sub) {
    notFound();
  }
  if (request.status !== "approved") {
    redirect(`/citizen/requests/${request.id}`);
  }

  const approval = [...request.history].reverse().find((h) => h.status === "approved");

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-6">
        <Link href={`/citizen/requests/${request.id}`} className="text-sm text-ink-soft hover:text-accent">
          ← Back to request
        </Link>
      </div>

      <div className="border-2 border-ink p-8">
        <div className="flex items-start justify-between border-b border-line pb-6">
          <div>
            <p className="font-display text-lg font-semibold text-ink">ServeTrack</p>
            <p className="text-xs tracking-wide text-brass uppercase">Approval Confirmation</p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wide text-ink-soft uppercase">Reference</p>
            <p className="font-display text-lg font-semibold text-ink">{referenceNumber(request.id)}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-y-5 text-sm">
          <div className="col-span-2">
            <dt className="text-xs tracking-wide text-ink-soft uppercase">Service</dt>
            <dd className="mt-1 text-base font-semibold text-ink">{request.serviceType.name}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink-soft uppercase">Applicant</dt>
            <dd className="mt-1 font-medium text-ink">{request.citizen.name}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink-soft uppercase">Approved</dt>
            <dd className="mt-1 font-medium text-ink">
              {(approval?.changedAt ?? request.resolvedAt ?? request.submittedAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink-soft uppercase">Submitted</dt>
            <dd className="mt-1 font-medium text-ink">{request.submittedAt.toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink-soft uppercase">Issued by</dt>
            <dd className="mt-1 font-medium text-ink">{approval?.changedBy.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink-soft uppercase">Fee</dt>
            <dd className="mt-1 font-medium text-ink">
              {formatFee(request.feeGhs)}
              {request.sizeTier && <span className="text-ink-soft"> ({request.sizeTier})</span>}
            </dd>
          </div>
        </dl>

        {approval?.remark && (
          <div className="mt-5 border-t border-line pt-5 text-sm">
            <p className="text-xs tracking-wide text-ink-soft uppercase">Note from officer</p>
            <p className="mt-1 text-ink">{approval.remark}</p>
          </div>
        )}

        <p className="mt-8 border-t border-line pt-4 text-xs text-ink-soft">
          This is a system-generated confirmation of an approval recorded in ServeTrack on{" "}
          {(approval?.changedAt ?? new Date()).toLocaleString()}. It is not a legally binding permit certificate —
          contact the Assembly directly to verify or obtain an official document. The fee shown is informational;
          ServeTrack does not collect payment — pay through the Assembly&apos;s existing payment channels.
        </p>
      </div>

      <div className="no-print mt-6 flex justify-center">
        <PrintButton />
      </div>
    </div>
  );
}
