import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const crewHash = await bcrypt.hash("crew123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@fleet.com" },
    update: {},
    create: {
      email: "admin@fleet.com",
      passwordHash: adminHash,
      role: "FLEET_ADMIN",
    },
  });

  const crew = await prisma.user.upsert({
    where: { email: "crew@vessel.com" },
    update: {},
    create: {
      email: "crew@vessel.com",
      passwordHash: crewHash,
      role: "CREW_MEMBER",
    },
  });

  const v1 = await prisma.vessel.upsert({
    where: { imo: "IMO9012345" },
    update: {},
    create: {
      name: "Pacific Dawn",
      imo: "IMO9012345",
      flag: "Liberia",
      type: "Container Ship",
      status: "Active",
      lastInspectionDate: new Date("2024-06-15"),
    },
  });

  const v2 = await prisma.vessel.upsert({
    where: { imo: "IMO9023456" },
    update: {},
    create: {
      name: "Atlantic Star",
      imo: "IMO9023456",
      flag: "Panama",
      type: "Bulk Carrier",
      status: "In Port",
      lastInspectionDate: new Date("2024-05-20"),
    },
  });

  const v3 = await prisma.vessel.upsert({
    where: { imo: "IMO9034567" },
    update: {},
    create: {
      name: "Nordic Explorer",
      imo: "IMO9034567",
      flag: "Norway",
      type: "Tanker",
      status: "Under Maintenance",
      lastInspectionDate: new Date("2024-03-10"),
    },
  });

  // Assign crew to v1 and v2
  await prisma.userVessel.upsert({
    where: { userId_vesselId: { userId: crew.id, vesselId: v1.id } },
    update: {},
    create: { userId: crew.id, vesselId: v1.id },
  });
  await prisma.userVessel.upsert({
    where: { userId_vesselId: { userId: crew.id, vesselId: v2.id } },
    update: {},
    create: { userId: crew.id, vesselId: v2.id },
  });

  await prisma.issue.deleteMany({});
  const toCreate = [
    { vesselId: v1.id, category: "Engine", description: "Unusual noise from main engine at high RPM.", priority: "High", status: "Open", recommendation: null, reportedById: crew.id },
    { vesselId: v1.id, category: "Safety", description: "Life jacket stock low in forward section.", priority: "Med", status: "Resolved", recommendation: "Life jackets replenished.", reportedById: crew.id },
    { vesselId: v2.id, category: "Navigation", description: "GPS intermittent signal in specific area.", priority: "Low", status: "Open", recommendation: null, reportedById: crew.id },
    { vesselId: v2.id, category: "Electrical", description: "Port-side deck lights flickering.", priority: "Med", status: "Open", recommendation: null, reportedById: crew.id },
    { vesselId: v3.id, category: "Hull", description: "Rust spots on starboard hull near waterline.", priority: "High", status: "Resolved", recommendation: "Inspection completed; minor repairs scheduled.", reportedById: null },
    { vesselId: v1.id, category: "Other", description: "Galley exhaust fan not operating correctly.", priority: "Low", status: "Resolved", recommendation: "Resolved during routine check.", reportedById: crew.id },
  ];
  await prisma.issue.createMany({ data: toCreate });

  console.log("Seed done:", { admin: admin.email, crew: crew.email, vessels: 3, issues: 6 });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
