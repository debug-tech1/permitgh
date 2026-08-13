"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

const TABS = [
  { key: "register", label: "Register" },
  { key: "login", label: "Sign In" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AuthTabs({ initialTab = "register" }: { initialTab?: TabKey }) {
  const [active, setActive] = useState<TabKey>(initialTab);

  return (
    <div className="border border-line bg-paper-raised p-6">
      <div className="flex gap-6 border-b border-line" role="tablist" aria-label="Register or sign in">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${
              active === tab.key ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {active === "register" ? (
          <div>
            <p className="mb-4 text-xs text-ink-soft">
              For residents submitting permit applications. Officer and admin accounts are issued by the Assembly.
            </p>
            <RegisterForm />
          </div>
        ) : (
          <div>
            <p className="mb-4 text-xs text-ink-soft">Citizens, case officers, and Assembly admins all sign in here.</p>
            <LoginForm />
          </div>
        )}
      </div>
    </div>
  );
}
