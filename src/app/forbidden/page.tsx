import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">Not accessible from this account</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Your account doesn&apos;t have access to that area of PermitGH. If you think this is wrong, contact the
        Assembly.
      </p>
      <Link href="/" className="mt-6 inline-block font-semibold text-accent hover:underline">
        Back to the accountability dashboard
      </Link>
    </div>
  );
}
