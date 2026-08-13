// Pure, dependency-free SLA logic — see FIG. 4 (Request Lifecycle) and
// FIG. 5 (Sequence) in the system design doc. "Overdue" is intentionally
// not a stored status: it is computed here, from the clock, every time a
// request is read. Kept dependency-free so it's cheap to unit test.

export const REQUEST_STATUSES = [
  "received",
  "under_review",
  "additional_info_needed",
  "approved",
  "rejected",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const TERMINAL_STATUSES: readonly RequestStatus[] = ["approved", "rejected"];

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** SLA deadline is set once, at submission — never recomputed afterwards. */
export function computeSlaDeadline(submittedAt: Date, slaDays: number): Date {
  const deadline = new Date(submittedAt);
  deadline.setDate(deadline.getDate() + slaDays);
  return deadline;
}

/** A request is overdue if it's still open past its deadline — nothing more. */
export function isOverdue(now: Date, slaDeadline: Date, status: string): boolean {
  return !isTerminalStatus(status) && now.getTime() > slaDeadline.getTime();
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// Mirrors FIG. 4 (Request Lifecycle) exactly — the officer UI only ever
// offers transitions that exist on that diagram.
export const NEXT_STATUSES: Record<RequestStatus, RequestStatus[]> = {
  received: ["under_review"],
  under_review: ["additional_info_needed", "approved", "rejected"],
  additional_info_needed: ["under_review"],
  approved: [],
  rejected: [],
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  received: "Received",
  under_review: "Under Review",
  additional_info_needed: "Additional Info Needed",
  approved: "Approved",
  rejected: "Rejected",
};
