import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSession } from "@/lib/auth";
import { parseDateParam } from "@/lib/reports";
import { referenceNumber } from "@/lib/format";

// Proxy.ts already gates /admin/:path*, but Route Handlers get their own
// distinct URL (unlike Server Actions, which can bypass path-based
// matchers — see proxy.ts's comment) so this re-checks anyway, consistent
// with every other mutation/read in the admin surface.
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  try {
    await requireSession(["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const from = parseDateParam(searchParams.get("from") ?? undefined);
  const to = parseDateParam(searchParams.get("to") ?? undefined, true);
  const submittedAtFilter =
    from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

  const requests = await prisma.serviceRequest.findMany({
    where: submittedAtFilter ? { submittedAt: submittedAtFilter } : undefined,
    include: { citizen: true, serviceType: true },
    orderBy: { submittedAt: "asc" },
  });

  const header = [
    "Reference",
    "Service",
    "Applicant",
    "Applicant Phone",
    "Property Location",
    "Status",
    "Submitted",
    "Resolved",
    "Fee (GHS)",
    "Paid",
    "Waiver (GHS)",
    "Size/Category",
  ];
  const lines = [header.join(",")];
  for (const r of requests) {
    lines.push(
      [
        referenceNumber(r.id),
        r.serviceType.name,
        r.citizen.name,
        r.citizen.phone ?? "",
        r.propertyLocation ?? "",
        r.status,
        r.submittedAt.toISOString(),
        r.resolvedAt ? r.resolvedAt.toISOString() : "",
        r.feeGhs ?? "",
        r.paidAt ? r.paidAt.toISOString() : "",
        r.waiverGhs,
        r.sizeTier ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="permitgh-requests.csv"',
    },
  });
}
