import { prisma } from "@/lib/db";
import { SlaForm } from "@/components/admin/sla-form";

export default async function ServiceTypesPage() {
  const serviceTypes = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Service Types</h1>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Set the SLA for each service. Changing it only affects requests submitted after the change — it never moves
        an in-flight request&apos;s deadline.
      </p>

      <ul className="mt-6 divide-y divide-line border border-line">
        {serviceTypes.map((st) => (
          <li key={st.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">{st.name}</p>
              <p className="mt-0.5 max-w-md text-xs text-ink-soft">{st.description}</p>
            </div>
            <SlaForm serviceTypeId={st.id} currentSlaDays={st.slaDays} />
          </li>
        ))}
      </ul>
    </div>
  );
}
