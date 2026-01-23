import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin-only job: simulate a maintenance scan (e.g. flag vessels with old lastInspectionDate). */
export async function POST() {
  try {
    await requireAdmin();
  } catch (e: unknown) {
    const err = e as { status?: number };
    return NextResponse.json(
      { error: err.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: err.status || 403 }
    );
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const due = await prisma.vessel.findMany({
    where: {
      OR: [
        { lastInspectionDate: { lt: ninetyDaysAgo } },
        { lastInspectionDate: null },
      ],
    },
    select: { id: true, name: true, imo: true, lastInspectionDate: true },
  });

  return NextResponse.json({
    ok: true,
    message: "Maintenance scan completed.",
    vesselsDueForInspection: due,
  });
}
