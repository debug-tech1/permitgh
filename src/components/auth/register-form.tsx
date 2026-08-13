"use client";

import { useActionState } from "react";
import { registerCitizen, type ActionState } from "@/actions/auth-actions";

const initialState: ActionState = undefined;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerCitizen, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Full name</span>
        <input
          type="text"
          name="name"
          required
          autoComplete="name"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>
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
        <span className="font-medium text-ink">Phone number</span>
        <input
          type="tel"
          name="phone"
          required
          autoComplete="tel"
          placeholder="024 123 4567"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">GPS address</span>
        <input
          type="text"
          name="gpsAddress"
          required
          placeholder="GA-184-9312"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
        <span className="text-xs text-ink-soft">Your GhanaPostGPS digital address.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
        <span className="text-xs text-ink-soft">At least 8 characters.</span>
      </label>
      {state?.error && <p className="text-sm text-status-critical">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-sm bg-accent px-4 py-2 font-semibold text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
