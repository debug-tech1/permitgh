"use client";

import { useActionState } from "react";
import { submitRequest, type ActionState } from "@/actions/request-actions";
import { formatFee } from "@/lib/format";
import type { FeeTier } from "@/lib/fees";

const initialState: ActionState = undefined;

type ServiceTypeOption = {
  id: string;
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
        {serviceTypes.map((st) => (
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
                {st.feeTiers.length > 0 ? `from ${formatFee(st.feeTiers[0].feeGhs)}` : formatFee(st.feeGhs)}
              </span>
              {st.feeTiers.length > 0 && (
                <span className="mt-2 block text-xs">
                  <span className="font-medium text-ink">Size (sets the fee):</span>
                  <span className="mt-1 flex flex-wrap gap-2">
                    {st.feeTiers.map((tier) => (
                      <label
                        key={tier.label}
                        className="flex cursor-pointer items-center gap-1.5 border border-line bg-paper px-2 py-1 has-[:checked]:border-brass has-[:checked]:bg-brass/10"
                      >
                        <input type="radio" name="sizeTier" value={tier.label} className="accent-brass" />
                        <span className="text-ink-soft">
                          {tier.label} — <span className="font-medium text-ink">{formatFee(tier.feeGhs)}</span>
                        </span>
                      </label>
                    ))}
                  </span>
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
        ))}
      </fieldset>

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
