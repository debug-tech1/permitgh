import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-soft">Citizens, case officers, and Assembly admins all sign in here.</p>
      <div className="mt-6 border border-line bg-paper-raised p-6">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        New citizen?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
