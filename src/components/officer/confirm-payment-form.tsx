"use client";

import { useActionState } from "react";
import { confirmPayment, type ActionState } from "@/actions/officer-actions";

const initialState: ActionState = undefined;

export function ConfirmPaymentForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(confirmPayment, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 border border-status-warn/40 bg-status-warn/10 p-3">
      <input type="hidden" name="requestId" value={requestId} />
      <p className="text-sm text-status-warn">Billed. Awaiting payment confirmation before this can be approved.</p>
      <button
        type="submit"
        disabled={pending}
        className="ml-auto rounded-sm bg-status-warn px-4 py-1.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark as paid"}
      </button>
      {state?.error && <p className="w-full text-sm text-status-critical">{state.error}</p>}
    </form>
  );
}
