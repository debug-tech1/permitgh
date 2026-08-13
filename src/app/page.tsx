import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeRouteForRole } from "@/lib/auth";
import { AuthTabs } from "@/components/auth/auth-tabs";

const WHAT_YOU_CAN_DO = [
  {
    title: "Apply online",
    body: "Choose a service, attach your documents, and track your application from your phone — no office visit needed just to check status.",
  },
  {
    title: "Know your deadline",
    body: "Every application gets a statutory turnaround deadline the moment you submit it. No guessing how long it “usually” takes.",
  },
  {
    title: "See the record",
    body: "A public dashboard shows how each service is actually performing against its own promise — no account needed to look.",
  },
] as const;

export default async function WelcomePage() {
  // Anyone already signed in has a role-specific home (admin's performance
  // view, a citizen's requests, an officer's queue) that's more useful to
  // land on than the anonymous welcome page.
  const session = await getSession();
  if (session) redirect(homeRouteForRole(session.role));

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-wide text-brass uppercase">Welcome</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Welcome to PermitGH</h1>
        <p className="mt-3 text-sm text-ink-soft">
          PermitGH is the Assembly&apos;s home for permit and service applications — a Business Operating Permit, a
          Building Permit, a Market Stall Permit, or an annual Property Rate assessment. The moment you submit, your
          application gets a clear turnaround deadline. Case officers work each service&apos;s queue, bill and
          confirm payment through the Assembly&apos;s usual channels, and move your application through to a
          decision — with every status change kept on record.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {WHAT_YOU_CAN_DO.map((item) => (
          <div key={item.title} className="border border-line bg-paper-raised p-5">
            <h2 className="text-sm font-semibold text-ink">{item.title}</h2>
            <p className="mt-2 text-xs text-ink-soft">{item.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm">
        <Link href="/accountability" className="font-semibold text-accent hover:underline">
          See how the Assembly is performing →
        </Link>
      </p>

      <div className="mx-auto mt-10 max-w-sm border-t border-line pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Get started</h2>
        <p className="mt-1 text-sm text-ink-soft">Register as a new applicant, or sign in to an existing account.</p>
        <div className="mt-6">
          <AuthTabs />
        </div>
      </div>
    </div>
  );
}
