import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft">
        For residents submitting permit applications. Officer and admin accounts are issued by the Assembly.
      </p>
      <div className="mt-6 border border-line bg-paper-raised p-6">
        <RegisterForm />
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
