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
  console.log("Seeding ServeTrack demo data...");

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
      description:
        "Allocation or renewal of a licensed trading stall in an Assembly-managed market.",
      requiredDocuments: [
        "Valid Ghana Card (National ID)",
        "Passport-sized photograph",
        "Previous stall permit, if renewing",
      ],
    },
  });

  await prisma.user.create({
    data: {
      name: "Assembly Admin",
      email: "admin@servetrack.test",
      passwordHash,
      role: "admin",
    },
  });

  const officerBusiness = await prisma.user.create({
    data: {
      name: "Officer Adjei",
      email: "officer.business@servetrack.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: businessPermit.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Officer Boateng",
      email: "officer.building@servetrack.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: buildingPermit.id,
    },
  });

  const officerMarket = await prisma.user.create({
    data: {
      name: "Officer Mensah",
      email: "officer.market@servetrack.test",
      passwordHash,
      role: "officer",
      assignedServiceTypeId: marketStallPermit.id,
    },
  });

  const citizenAma = await prisma.user.create({
    data: {
      name: "Ama Serwaa",
      email: "citizen@servetrack.test",
      passwordHash,
      role: "citizen",
    },
  });

  const citizenKwame = await prisma.user.create({
    data: {
      name: "Kwame Owusu",
      email: "citizen2@servetrack.test",
      passwordHash,
      role: "citizen",
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
      submittedAt: submittedAt3,
      slaDeadline: computeSlaDeadline(submittedAt3, marketStallPermit.slaDays),
      resolvedAt: resolvedAt3,
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
      submittedAt: submittedAt4,
      slaDeadline: computeSlaDeadline(submittedAt4, businessPermit.slaDays),
      resolvedAt: resolvedAt4,
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

  console.log("Seed complete.");
  console.log("");
  console.log("Login credentials (password for all: Password123!):");
  console.log("  Admin:    admin@servetrack.test");
  console.log("  Officer:  officer.business@servetrack.test  (Business Operating Permit)");
  console.log("  Officer:  officer.building@servetrack.test  (Building Permit)");
  console.log("  Officer:  officer.market@servetrack.test    (Market Stall Permit)");
  console.log("  Citizen:  citizen@servetrack.test            (Ama Serwaa)");
  console.log("  Citizen:  citizen2@servetrack.test           (Kwame Owusu)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
