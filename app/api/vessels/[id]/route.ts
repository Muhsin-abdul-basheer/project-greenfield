import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin, canAccessVessel } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  imo: z.string().min(1).optional(),
  flag: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  lastInspectionDate: z.union([z.string(), z.null()]).optional(),
  assignedCrewIds: z.array(z.string()).optional(),
});

/* ========================= GET ========================= */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let session;
  try {
    session = await requireAuth();
  } catch (e: any) {
    return NextResponse.json(
      { error: e.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: e.status || 401 }
    );
  }

  const ok = await canAccessVessel(session, id);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vessel = await prisma.vessel.findUnique({
    where: { id },
    include: {
      issues: { where: { status: "Open" }, select: { id: true } },
      assignedCrew: { select: { userId: true } },
    },
  });

  if (!vessel) {
    return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
  }

  const { issues, assignedCrew, ...rest } = vessel;

  return NextResponse.json({
    ...rest,
    openIssueCount: issues.length,
    assignedCrewIds: assignedCrew.map(c => c.userId),
  });
}

/* ========================= PATCH ========================= */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await requireAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { error: e.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: e.status || 403 }
    );
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.name != null) update.name = d.name;
  if (d.imo != null) update.imo = d.imo;
  if (d.flag != null) update.flag = d.flag;
  if (d.type != null) update.type = d.type;
  if (d.status != null) update.status = d.status;
  if (d.lastInspectionDate !== undefined) {
    update.lastInspectionDate = d.lastInspectionDate
      ? new Date(d.lastInspectionDate)
      : null;
  }

  try {
    /* ---------- Validate vessel ---------- */
    const vesselExists = await prisma.vessel.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!vesselExists) {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }

    /* ---------- Validate crew IDs ---------- */
    if (d.assignedCrewIds) {
      const users = await prisma.user.findMany({
        where: { id: { in: d.assignedCrewIds } },
        select: { id: true },
      });

      if (users.length !== d.assignedCrewIds.length) {
        return NextResponse.json(
          { error: "One or more assigned crew members do not exist" },
          { status: 400 }
        );
      }
    }

    /* ---------- Transaction: crew + vessel ---------- */
    const result = await prisma.$transaction(async tx => {
      if (d.assignedCrewIds !== undefined) {
        await tx.userVessel.deleteMany({
          where: { vesselId: id },
        });

        if (d.assignedCrewIds.length > 0) {
          await tx.userVessel.createMany({
            data: d.assignedCrewIds.map(userId => ({
              userId,
              vesselId: id,
            })),
          });
        }
      }

      if (Object.keys(update).length > 0) {
        return tx.vessel.update({
          where: { id },
          data: update,
        });
      }

      return tx.vessel.findUniqueOrThrow({ where: { id } });
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("FULL ERROR:", e);

    if (e.code === "P2025") {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }

    if (e.code === "P2002") {
      return NextResponse.json({ error: "IMO already exists" }, { status: 400 });
    }

    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}

/* ========================= DELETE ========================= */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await requireAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { error: e.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: e.status || 403 }
    );
  }

  try {
    await prisma.vessel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }

    console.error("FULL ERROR:", e);
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}
