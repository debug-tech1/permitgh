"use client";

import { useActionState } from "react";
import { submitRequest, type ActionState } from "@/actions/request-actions";

const initialState: ActionState = undefined;

type ServiceTypeOption = { id: string; name: string; slaDays: number; description: string };

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
              <span className="mt-1 block text-xs font-medium text-brass">SLA: {st.slaDays} working days</span>
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
        <span className="font-medium text-ink">Supporting document (optional)</span>
        <input type="file" name="attachment" className="text-sm text-ink-soft" />
        <span className="text-xs text-ink-soft">2MB maximum.</span>
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
