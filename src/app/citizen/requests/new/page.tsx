import { prisma } from "@/lib/db";
import { SubmitRequestForm } from "@/components/citizen/submit-request-form";
import { parseFeeTiers } from "@/lib/fees";
import { CitizenTabs } from "@/components/citizen/citizen-tabs";

export default async function NewRequestPage() {
  const serviceTypes = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });
  const serviceTypeOptions = serviceTypes.map((st) => ({
    ...st,
    feeTiers: parseFeeTiers(st.feeTiers),
  }));

  return (
    <div>
      <CitizenTabs active="new" />

      <div className="mx-auto mt-6 max-w-2xl">
        <h1 className="font-display text-2xl font-semibold text-ink">Submit a new request</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Choose the service you need. Your SLA deadline is set the moment you submit.
        </p>
        <div className="mt-6 border border-line bg-paper-raised p-6">
          <SubmitRequestForm serviceTypes={serviceTypeOptions} />
        </div>
      </div>
    </div>
  );
}
