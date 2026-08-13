import { describe, expect, it } from "vitest";
import { computeSlaDeadline, daysBetween, isOverdue, isTerminalStatus, NEXT_STATUSES } from "./sla";

describe("computeSlaDeadline", () => {
  it("adds the SLA days to the submission date", () => {
    const submitted = new Date("2026-01-01T00:00:00.000Z");
    expect(computeSlaDeadline(submitted, 5).toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });

  it("handles month rollover", () => {
    const submitted = new Date("2026-01-30T00:00:00.000Z");
    expect(computeSlaDeadline(submitted, 5).toISOString()).toBe("2026-02-04T00:00:00.000Z");
  });
});

describe("isOverdue", () => {
  const deadline = new Date("2026-01-10T00:00:00.000Z");

  it("is false before the deadline", () => {
    expect(isOverdue(new Date("2026-01-05T00:00:00.000Z"), deadline, "under_review")).toBe(false);
  });

  it("is true after the deadline while still open", () => {
    expect(isOverdue(new Date("2026-01-11T00:00:00.000Z"), deadline, "under_review")).toBe(true);
  });

  it("is false after the deadline once approved — the clock stops at resolution", () => {
    expect(isOverdue(new Date("2026-01-11T00:00:00.000Z"), deadline, "approved")).toBe(false);
  });

  it("is false after the deadline once rejected", () => {
    expect(isOverdue(new Date("2026-01-11T00:00:00.000Z"), deadline, "rejected")).toBe(false);
  });
});

describe("isTerminalStatus", () => {
  it.each(["approved", "rejected"])("%s is terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(true);
  });

  it.each(["received", "under_review", "additional_info_needed"])("%s is not terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts whole days regardless of time-of-day", () => {
    const a = new Date("2026-01-01T08:00:00.000Z");
    const b = new Date("2026-01-06T08:00:00.000Z");
    expect(daysBetween(a, b)).toBe(5);
  });
});

describe("NEXT_STATUSES (mirrors FIG. 4's transition graph)", () => {
  it("only allows received -> under_review", () => {
    expect(NEXT_STATUSES.received).toEqual(["under_review"]);
  });

  it("allows under_review to branch three ways", () => {
    expect(NEXT_STATUSES.under_review).toEqual(["additional_info_needed", "approved", "rejected"]);
  });

  it("routes additional_info_needed back to under_review only", () => {
    expect(NEXT_STATUSES.additional_info_needed).toEqual(["under_review"]);
  });

  it("has no outgoing transitions from terminal states", () => {
    expect(NEXT_STATUSES.approved).toEqual([]);
    expect(NEXT_STATUSES.rejected).toEqual([]);
  });
});
