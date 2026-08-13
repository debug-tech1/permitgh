"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/actions/auth-actions";

const initialState: ActionState = undefined;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>
      {state?.error && <p className="text-sm text-status-critical">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-sm bg-accent px-4 py-2 font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
