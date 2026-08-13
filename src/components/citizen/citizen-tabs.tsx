import Link from "next/link";

const TABS = [
  { key: "requests", label: "My Requests", href: "/citizen/requests" },
  { key: "new", label: "New Request", href: "/citizen/requests/new" },
] as const;

export function CitizenTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="flex gap-6 border-b border-line" role="tablist" aria-label="Your requests">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-selected={active === tab.key}
          className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${
            active === tab.key ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
