import { STATUS_LABELS, type RequestStatus } from "@/lib/sla";

const STATUS_STYLES: Record<RequestStatus, string> = {
  received: "bg-ink-soft/10 text-ink-soft border-ink-soft/30",
  under_review: "bg-accent/10 text-accent border-accent/30",
  additional_info_needed: "bg-status-warn/10 text-status-warn border-status-warn/30",
  approved: "bg-status-ok/10 text-status-ok border-status-ok/30",
  rejected: "bg-status-critical/10 text-status-critical border-status-critical/30",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as RequestStatus;
  const style = STATUS_STYLES[s] ?? STATUS_STYLES.received;
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap ${style}`}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-sm border border-status-critical/40 bg-status-critical/10 px-2 py-0.5 text-xs font-bold tracking-wide text-status-critical">
      Overdue
    </span>
  );
}
