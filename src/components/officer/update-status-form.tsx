"use client";

import { useActionState } from "react";
import { updateRequestStatus, type ActionState } from "@/actions/officer-actions";
import { STATUS_LABELS, type RequestStatus } from "@/lib/sla";

const initialState: ActionState = undefined;

export function UpdateStatusForm({
  requestId,
  nextStatuses,
}: {
  requestId: string;
  nextStatuses: RequestStatus[];
}) {
  const [state, formAction, pending] = useActionState(updateRequestStatus, initialState);

  if (nextStatuses.length === 0) return null;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Move to</span>
        <select name="status" required defaultValue="" className="border border-line bg-paper px-2 py-1.5 text-sm text-ink">
          <option value="" disabled>
            Choose…
          </option>
          {nextStatuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Remark (optional)</span>
        <input type="text" name="remark" className="border border-line bg-paper px-2 py-1.5 text-sm text-ink" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-accent px-4 py-1.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update"}
      </button>
      {state?.error && <p className="w-full text-sm text-status-critical">{state.error}</p>}
    </form>
  );
}
