"use client";

import { useActionState } from "react";
import { resetUserPassword, type ActionState } from "@/actions/admin-actions";

const initialState: ActionState = undefined;

export function ResetPasswordForm({ userId, userName }: { userId: string; userName: string }) {
  const [state, formAction, pending] = useActionState(resetUserPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm(`Reset ${userName}'s password? Their current password stops working immediately.`)) {
            e.preventDefault();
          }
        }}
        className="text-xs font-semibold text-accent hover:underline disabled:opacity-60"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {state?.newPassword && (
        <p className="max-w-[220px] text-right text-xs text-status-ok">
          New password: <span className="font-mono font-semibold">{state.newPassword}</span>. Share this with them
          directly. It won&apos;t be shown again.
        </p>
      )}
      {state?.error && <p className="text-xs text-status-critical">{state.error}</p>}
    </form>
  );
}
