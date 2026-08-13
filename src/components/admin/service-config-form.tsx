"use client";

import { useActionState } from "react";
import { updateServiceTypeConfig, type ActionState } from "@/actions/admin-actions";

const initialState: ActionState = undefined;

export function ServiceConfigForm({
  serviceTypeId,
  currentSlaDays,
  currentFeeGhs,
}: {
  serviceTypeId: string;
  currentSlaDays: number;
  currentFeeGhs: number;
}) {
  const [state, formAction, pending] = useActionState(updateServiceTypeConfig, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="serviceTypeId" value={serviceTypeId} />
      <label className="flex items-center gap-2">
        <input
          type="number"
          name="slaDays"
          min={1}
          max={90}
          defaultValue={currentSlaDays}
          className="w-16 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        />
        <span className="text-xs text-ink-soft">SLA days</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">GH₵</span>
        <input
          type="number"
          name="feeGhs"
          min={0}
          max={100000}
          defaultValue={currentFeeGhs}
          className="w-20 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        />
        <span className="text-xs text-ink-soft">fee</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error && <span className="w-full text-xs text-status-critical">{state.error}</span>}
    </form>
  );
}
