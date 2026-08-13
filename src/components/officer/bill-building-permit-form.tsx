"use client";

import { useActionState } from "react";
import { billBuildingPermit, type ActionState } from "@/actions/officer-actions";
import { BUILDING_PERMIT_RATES } from "@/lib/fees";

const initialState: ActionState = undefined;

export function BillBuildingPermitForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(billBuildingPermit, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border border-brass/40 bg-brass/5 p-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-brass uppercase">Property type</span>
        <select
          name="propertyType"
          required
          defaultValue=""
          className="border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        >
          <option value="" disabled>
            Choose…
          </option>
          {Object.entries(BUILDING_PERMIT_RATES).map(([key, band]) => (
            <option key={key} value={key}>
              {band.label} (GH₵{band.min}–{band.max}/m²)
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Area (m²)</span>
        <input
          type="number"
          name="areaSqm"
          min={1}
          step="0.1"
          required
          className="w-24 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Rate (GH₵/m²)</span>
        <input
          type="number"
          name="rate"
          min={1}
          required
          className="w-20 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Processing (GH₵)</span>
        <input
          type="number"
          name="processingFee"
          min={0}
          defaultValue={0}
          required
          className="w-24 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Waiver GH₵ (optional)</span>
        <input
          type="number"
          name="waiverGhs"
          min={0}
          defaultValue={0}
          className="w-24 border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Waiver reason (if any)</span>
        <input type="text" name="waiverReason" className="border border-line bg-paper px-2 py-1.5 text-sm text-ink" />
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
