// Demo/dev seed data. Deliberately includes an overdue open case, an
// on-track open case, an on-time resolution, and a late resolution, so the
// public dashboard (FIG. "Public Accountability Dashboard") and officer
// queue have something real to show without manual clicking.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { computeSlaDeadline } from "../src/lib/sla";

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function main() {
  console.log("Seeding PermitGH demo data...");

  await prisma.attachment.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.serviceType.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const businessPermit = await prisma.serviceType.create({
    data: {
      name: "Business Operating Permit",
      slug: "business-operating-permit",
      slaDays: 5,
      feeGhs: 200, // "from" price shown before billing — lowest category
      feeTiers: [
        { label: "Retail / Trading", feeGhs: 200 },
        { label: "Food & Beverage / Restaurant", feeGhs: 350 },
        { label: "Professional Services", feeGhs: 300 },
        { label: "Wholesale / Distribution", feeGhs: 450 },
        { label: "Manufacturing / Industrial", feeGhs: 600 },
        { label: "Financial Services", feeGhs: 800 },
      ],
      description:
        "Annual renewal of a business's permit to legally operate within the Assembly's jurisdiction.",
      requiredDocuments: [
        "Valid Ghana Card (National ID)",
        "Tax Clearance Certificate",
        "Proof of business premises (tenancy agreement or property document)",
        "Previous permit, if renewing",
      ],
    },
  });

  // No feeGhs/feeTiers here — cost is rate x area + processing, computed by
  // the billing officer (see actions/officer-actions.ts#billBuildingPermit).
  const buildingPermit = await prisma.serviceType.create({
    data: {
      name: "Building Permit",
      slug: "building-permit",
      slaDays: 21,
      description:
        "Approval to construct or substantially renovate a building within the Assembly's jurisdiction.",
      requiredDocuments: [
        "Site plan or architectural drawings",
        "Proof of land ownership or lease agreement",
        "Valid Ghana Card (National ID)",
        "Structural engineer's report, for multi-storey buildings",
      ],
    },
  });

  const marketStallPermit = await prisma.serviceType.create({
    data: {
      name: "Market Stall Permit",
      slug: "market-stall-permit",
      slaDays: 7,
      feeGhs: 100,
      description:
        "Allocation or renewal of a licensed trading stall in an Assembly-managed market.",
      requiredDocuments: [
        "Valid Ghana Card (National ID)",
        "Passport-sized photograph",
        "Previous stall permit, if renewing",
      ],
    },
  });

  const propertyRate = await prisma.serviceType.create({
    data: {
      name: "Property Rate",
      slug: "property-rate",
      slaDays: 10,
      feeGhs: 150, // "from" price — lowest category
      feeTiers: [
        { label: "Residential — Owner-occupied", feeGhs: 150 },
        { label: "Residential — Rented / Investment", feeGhs: 300 },
        { label: "Commercial — Business use", feeGhs: 600 },
        { label: "Industrial — Business use", feeGhs: 900 },
      ],
      description: "Annual property rate assessment, based on the property's type and purpose of use.",
      requiredDocuments: [
        "Valid Ghana Card (National ID)",
        "Proof of property ownership (title deed or indenture)",
        "Previous property rate receipt, if renewing",
      ],
    },
  });

  await prisma.user.create({
    data: {
      name: "Assembly Admin",
      email: "admin@permitgh.test",
      passwordHash,
      role: "admin",
    },
  });

  const officerBusiness = await prisma.user.create({
    data: {
      name: "Officer Adjei",
      email: "officer.business@permitgh.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: businessPermit.id,
    },
  });

  const officerBuilding = await prisma.user.create({
    data: {
      name: "Officer Boateng",
      email: "officer.building@permitgh.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: buildingPermit.id,
    },
  });

  const officerMarket = await prisma.user.create({
    data: {
      name: "Officer Mensah",
      email: "officer.market@permitgh.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: marketStallPermit.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Officer Asante",
      email: "officer.property@permitgh.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: propertyRate.id,
    },
  });

  const citizenAma = await prisma.user.create({
    data: {
      name: "Ama Serwaa",
      email: "citizen@permitgh.test",
      passwordHash,
      role: "citizen",
      phone: "024 555 1234",
      gpsAddress: "GA-184-9312",
    },
  });

  const citizenKwame = await prisma.user.create({
    data: {
      name: "Kwame Owusu",
      email: "citizen2@permitgh.test",
      passwordHash,
      role: "citizen",
      phone: "020 777 5678",
      gpsAddress: "GA-256-4471",
    },
  });

  // 1. Overdue, still open (Business Operating Permit, 5-day SLA, submitted 10 days ago)
  const submittedAt1 = daysAgo(10);
  const req1 = await prisma.serviceRequest.create({
    data: {
      citizenId: citizenAma.id,
      serviceTypeId: businessPermit.id,
      status: "under_review",
      applicantNote: "Renewing operating permit for my provisions shop on Market Road.",
      propertyLocation: "GA-112-7734, Market Road, Accra",
      submittedAt: submittedAt1,
      slaDeadline: computeSlaDeadline(submittedAt1, businessPermit.slaDays),
    },
  });
  await prisma.statusHistory.createMany({
    data: [
      { requestId: req1.id, status: "received", changedById: citizenAma.id, changedAt: submittedAt1 },
      {
        requestId: req1.id,
        status: "under_review",
        remark: "Reviewing submitted documents.",
        changedById: officerBusiness.id,
        changedAt: daysAgo(9),
      },
    ],
  });

  // 2. On track, open (Building Permit, 21-day SLA, submitted 3 days ago)
  const submittedAt2 = daysAgo(3);
  const req2 = await prisma.serviceRequest.create({
    data: {
      citizenId: citizenAma.id,
      serviceTypeId: buildingPermit.id,
      status: "received",
      applicantNote: "Requesting approval to add a second floor to an existing residential building.",
      propertyLocation: "GA-184-9315, Kwabenya, Accra",
      submittedAt: submittedAt2,
      slaDeadline: computeSlaDeadline(submittedAt2, buildingPermit.slaDays),
    },
  });
  await prisma.statusHistory.create({
    data: { requestId: req2.id, status: "received", changedById: citizenAma.id, changedAt: submittedAt2 },
  });

  // 3. Resolved within SLA (Market Stall Permit, 7-day SLA, resolved in 6 days)
  const submittedAt3 = daysAgo(12);
  const resolvedAt3 = daysAgo(6);
  const req3 = await prisma.serviceRequest.create({
    data: {
      citizenId: citizenAma.id,
      serviceTypeId: marketStallPermit.id,
      status: "approved",
      applicantNote: "Renewing my stall license in the central market, block C.",
      propertyLocation: "Central Market, Block C, Stall 21, Kumasi",
      submittedAt: submittedAt3,
      slaDeadline: computeSlaDeadline(submittedAt3, marketStallPermit.slaDays),
      resolvedAt: resolvedAt3,
      feeGhs: marketStallPermit.feeGhs,
      billingDetail: `Flat fee: GH₵${marketStallPermit.feeGhs}`,
      paidAt: resolvedAt3,
    },
  });
  await prisma.statusHistory.createMany({
    data: [
      { requestId: req3.id, status: "received", changedById: citizenAma.id, changedAt: submittedAt3 },
      {
        requestId: req3.id,
        status: "under_review",
        changedById: officerMarket.id,
        changedAt: daysAgo(10),
      },
      {
        requestId: req3.id,
        status: "approved",
        remark: "Stall allocation confirmed. Permit issued.",
        changedById: officerMarket.id,
        changedAt: resolvedAt3,
      },
    ],
  });

  // 4. Resolved outside SLA (Business Operating Permit, 5-day SLA, resolved in 15 days)
  const submittedAt4 = daysAgo(20);
  const resolvedAt4 = daysAgo(5);
  const req4 = await prisma.serviceRequest.create({
    data: {
      citizenId: citizenKwame.id,
      serviceTypeId: businessPermit.id,
      status: "rejected",
      applicantNote: "New permit application for a hardware retail outlet.",
      propertyLocation: "GA-045-2210, Kaneshie, Accra",
      submittedAt: submittedAt4,
      slaDeadline: computeSlaDeadline(submittedAt4, businessPermit.slaDays),
      resolvedAt: resolvedAt4,
      sizeTier: "Retail / Trading",
      feeGhs: 200,
      billingDetail: "Retail / Trading: GH₵200",
      // Rejected before payment was ever collected — paidAt stays null.
    },
  });
  await prisma.statusHistory.createMany({
    data: [
      { requestId: req4.id, status: "received", changedById: citizenKwame.id, changedAt: submittedAt4 },
      {
        requestId: req4.id,
        status: "under_review",
        changedById: officerBusiness.id,
        changedAt: daysAgo(18),
      },
      {
        requestId: req4.id,
        status: "additional_info_needed",
        remark: "Missing tax clearance certificate.",
        changedById: officerBusiness.id,
        changedAt: daysAgo(16),
      },
      {
        requestId: req4.id,
        status: "under_review",
        remark: "Documents resubmitted.",
        changedById: officerBusiness.id,
        changedAt: daysAgo(10),
      },
      {
        requestId: req4.id,
        status: "rejected",
        remark: "Outstanding municipal rates not settled.",
        changedById: officerBusiness.id,
        changedAt: resolvedAt4,
      },
    ],
  });

  // 5. Billed but not yet paid (Building Permit, formula-billed, submitted 6 days ago)
  const submittedAt5 = daysAgo(6);
  const req5 = await prisma.serviceRequest.create({
    data: {
      citizenId: citizenKwame.id,
      serviceTypeId: buildingPermit.id,
      status: "under_review",
      applicantNote: "New two-storey residential building on a 120 sqm plot, Adenta.",
      propertyLocation: "GT-341-0087, Adenta",
      submittedAt: submittedAt5,
      slaDeadline: computeSlaDeadline(submittedAt5, buildingPermit.slaDays),
      feeGhs: 1590,
      billingDetail: "Residential: 120m² × GH₵12/m² = GH₵1,440 + Processing GH₵150 = GH₵1,590",
    },
  });
  await prisma.statusHistory.createMany({
    data: [
      { requestId: req5.id, status: "received", changedById: citizenKwame.id, changedAt: submittedAt5 },
      {
        requestId: req5.id,
        status: "under_review",
        remark: "Site plan reviewed and billed. Awaiting payment before approval.",
        changedById: officerBuilding.id,
        changedAt: daysAgo(4),
      },
    ],
  });

  // 6. Fresh, unbilled (Property Rate, submitted today)
  const submittedAt6 = new Date();
  const req6 = await prisma.serviceRequest.create({
    data: {
      citizenId: citizenAma.id,
      serviceTypeId: propertyRate.id,
      status: "received",
      applicantNote: "Annual rate assessment for my rented-out residential property on Spintex Road.",
      propertyLocation: "GA-500-1123, Spintex Road, Accra",
      submittedAt: submittedAt6,
      slaDeadline: computeSlaDeadline(submittedAt6, propertyRate.slaDays),
    },
  });
  await prisma.statusHistory.create({
    data: { requestId: req6.id, status: "received", changedById: citizenAma.id, changedAt: submittedAt6 },
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Login credentials (password for all: Password123!):");
  console.log("  Admin:    admin@permitgh.test");
  console.log("  Officer:  officer.business@permitgh.test  (Business Operating Permit)");
  console.log("  Officer:  officer.building@permitgh.test  (Building Permit)");
  console.log("  Officer:  officer.market@permitgh.test    (Market Stall Permit)");
  console.log("  Officer:  officer.property@permitgh.test  (Property Rate)");
  console.log("  Citizen:  citizen@permitgh.test            (Ama Serwaa)");
  console.log("  Citizen:  citizen2@permitgh.test           (Kwame Owusu)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
