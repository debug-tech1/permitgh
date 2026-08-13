"use client";

import { useActionState } from "react";
import { assessFee, type ActionState } from "@/actions/officer-actions";
import { formatFee } from "@/lib/format";
import type { FeeTier } from "@/lib/fees";

const initialState: ActionState = undefined;

export function AssessFeeForm({ requestId, tiers }: { requestId: string; tiers: FeeTier[] }) {
  const [state, formAction, pending] = useActionState(assessFee, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border border-brass/40 bg-brass/5 p-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-brass uppercase">Assess fee — choose size</span>
        <select name="sizeTier" required defaultValue="" className="border border-line bg-paper px-2 py-1.5 text-sm text-ink">
          <option value="" disabled>
            Choose…
          </option>
          {tiers.map((t) => (
            <option key={t.label} value={t.label}>
              {t.label} — {formatFee(t.feeGhs)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-brass px-4 py-1.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set fee"}
      </button>
      {state?.error && <p className="w-full text-sm text-status-critical">{state.error}</p>}
    </form>
  );
}
