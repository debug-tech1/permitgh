"use client";

import { useActionState } from "react";
import { updateServiceTypeSla, type ActionState } from "@/actions/admin-actions";

const initialState: ActionState = undefined;

export function SlaForm({ serviceTypeId, currentSlaDays }: { serviceTypeId: string; currentSlaDays: number }) {
  const [state, formAction, pending] = useActionState(updateServiceTypeSla, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="serviceTypeId" value={serviceTypeId} />
      <input
        type="number"
        name="slaDays"
        min={1}
        max={90}
        defaultValue={currentSlaDays}
        className="w-20 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
      />
      <span className="text-xs text-ink-soft">days</span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error && <span className="text-xs text-status-critical">{state.error}</span>}
    </form>
  );
}
