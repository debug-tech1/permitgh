"use client";

import { useActionState } from "react";
import { addAttachments, type ActionState } from "@/actions/request-actions";

const initialState: ActionState = undefined;

export function AddAttachmentsForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(addAttachments, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="tracking-wide text-ink-soft uppercase">Add documents</span>
        <input type="file" name="attachments" multiple className="text-sm text-ink-soft" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-status-critical px-4 py-1.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state?.error && <p className="w-full text-sm text-status-critical">{state.error}</p>}
    </form>
  );
}
