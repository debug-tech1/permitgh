"use client";

import { useActionState } from "react";
import { submitRequest, type ActionState } from "@/actions/request-actions";
import { formatFee } from "@/lib/format";
import { BUILDING_PERMIT_RATES, type FeeTier } from "@/lib/fees";

const initialState: ActionState = undefined;

type ServiceTypeOption = {
  id: string;
  slug: string;
  name: string;
  slaDays: number;
  feeGhs: number;
  feeTiers: FeeTier[];
  description: string;
  requiredDocuments: string[];
};

export function SubmitRequestForm({ serviceTypes }: { serviceTypes: ServiceTypeOption[] }) {
  const [state, formAction, pending] = useActionState(submitRequest, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink">Service type</legend>
        {serviceTypes.map((st) => {
          const isBuildingPermit = st.slug === "building-permit";
          return (
          <label
            key={st.id}
            className="flex cursor-pointer items-start gap-3 border border-line px-3 py-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5"
          >
            <input type="radio" name="serviceTypeId" value={st.id} required className="mt-1" />
            <span>
              <span className="block text-sm font-semibold text-ink">{st.name}</span>
              <span className="block text-xs text-ink-soft">{st.description}</span>
              <span className="mt-1 block text-xs font-medium text-brass">
                SLA: {st.slaDays} working days &middot; Fee:{" "}
                {isBuildingPermit
                  ? `GH₵${BUILDING_PERMIT_RATES.residential.min}–${BUILDING_PERMIT_RATES.commercial.max}/m², assessed by the reviewing officer`
                  : st.feeTiers.length > 0
                    ? `${formatFee(st.feeTiers[0].feeGhs)}–${formatFee(st.feeTiers[st.feeTiers.length - 1].feeGhs)}, assessed by the reviewing officer`
                    : formatFee(st.feeGhs)}
              </span>
              {isBuildingPermit && (
                <span className="mt-1 block text-xs text-ink-soft">
                  Cost is rate × floor area, plus a processing charge — the officer sets the exact figure after
                  reviewing your site plan, not you.
                </span>
              )}
              {!isBuildingPermit && st.feeTiers.length > 0 && (
                <span className="mt-1 block text-xs text-ink-soft">
                  The exact fee depends on which option applies ({st.feeTiers.map((t) => t.label).join(" / ")}) — the
                  officer reviewing your application sets it, not you.
                </span>
              )}
              {st.requiredDocuments.length > 0 && (
                <span className="mt-2 block text-xs text-ink-soft">
                  <span className="font-medium text-ink">You&apos;ll need:</span>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {st.requiredDocuments.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </span>
              )}
            </span>
          </label>
          );
        })}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Property / site location</span>
        <input
          type="text"
          name="propertyLocation"
          required
          minLength={4}
          placeholder="GPS address (e.g. GA-184-9312) or a description of where the property is"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
        <span className="text-xs text-ink-soft">Where the property this request concerns is located.</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Describe your request</span>
        <textarea
          name="applicantNote"
          required
          minLength={10}
          rows={4}
          placeholder="e.g. Renewing my provisions shop permit on Market Road."
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Supporting documents (optional)</span>
        <input type="file" name="attachments" multiple className="text-sm text-ink-soft" />
        <span className="text-xs text-ink-soft">Up to 5 files, 2MB maximum each.</span>
      </label>

      {state?.error && <p className="text-sm text-status-critical">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-sm bg-accent px-5 py-2 font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
