import { prisma } from "@/lib/db";
import { ServiceConfigForm } from "@/components/admin/service-config-form";
import { BUILDING_PERMIT_RATES, parseFeeTiers } from "@/lib/fees";
import { formatFee } from "@/lib/format";

export default async function ServiceTypesPage() {
  const serviceTypes = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Service Types</h1>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Set the SLA and base fee for each service. Changing either only affects requests submitted after the
        change — it never moves an in-flight request&apos;s deadline or the fee it was shown.
      </p>

      <ul className="mt-6 divide-y divide-line border border-line">
        {serviceTypes.map((st) => {
          const tiers = parseFeeTiers(st.feeTiers);
          return (
            <li key={st.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{st.name}</p>
                <p className="mt-0.5 max-w-md text-xs text-ink-soft">{st.description}</p>
                {tiers.length > 0 && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Tiered fee (not admin-editable yet): {tiers.map((t) => `${t.label} ${formatFee(t.feeGhs)}`).join(" · ")}
                  </p>
                )}
                {st.slug === "building-permit" && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Formula-billed (not admin-editable yet): GH₵{BUILDING_PERMIT_RATES.residential.min}–
                    {BUILDING_PERMIT_RATES.residential.max}/m² residential, GH₵
                    {BUILDING_PERMIT_RATES.commercial.min}–{BUILDING_PERMIT_RATES.commercial.max}/m² commercial, ×
                    area + officer-set processing charge. The fee/SLA fields below aren&apos;t used for this
                    service&apos;s cost.
                  </p>
                )}
              </div>
              <ServiceConfigForm serviceTypeId={st.id} currentSlaDays={st.slaDays} currentFeeGhs={st.feeGhs} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
