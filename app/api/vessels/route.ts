import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  let session;
  try {
    session = await requireAuth();
  } catch (e: unknown) {
    const err = e as { status?: number };
    return NextResponse.json(
      { error: err.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: err.status || 401 }
    );
  }

  try {
    if (session.role === "FLEET_ADMIN") {
      const vessels = await prisma.vessel.findMany({
        orderBy: { name: "asc" },
        include: {
          issues: { where: { status: "Open" }, select: { id: true } },
        },
      });
      return NextResponse.json(
        vessels.map((v) => {
          const { issues, ...rest } = v;
          return { ...rest, openIssueCount: issues.length };
        })
      );
    }

    const vessels = await prisma.vessel.findMany({
      where: {
        assignedCrew: { some: { userId: session.sub } },
      },
      orderBy: { name: "asc" },
      include: {
        issues: { where: { status: "Open" }, select: { id: true } },
      },
    });
    return NextResponse.json(
      vessels.map((v) => {
        const { issues, ...rest } = v;
        return { ...rest, openIssueCount: issues.length };
      })
    );
  } catch (e) {
    console.error("GET /api/vessels", e);
    console.error("FULL ERROR:", e);

  return NextResponse.json(
    {
      error: e.message,
      code: e.code,
      meta: e.meta
    },
    { status: 500 }
  );
  }
}

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  imo: z.string().min(1, "IMO required"),
  flag: z.string().min(1, "Flag required"),
  type: z.string().min(1, "Type required"),
  status: z.string().min(1, "Status required"),
  lastInspectionDate: z.union([z.string(), z.null()]).optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch (e: unknown) {
    const err = e as { status?: number };
    return NextResponse.json(
      { error: err.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: err.status || 401 }
    );
  }
  if (session.role !== "FLEET_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const data = { ...parsed.data, lastInspectionDate: parsed.data.lastInspectionDate ? new Date(parsed.data.lastInspectionDate) : null };
  try {
    const vessel = await prisma.vessel.create({
      data: {
        name: data.name,
        imo: data.imo,
        flag: data.flag,
        type: data.type,
        status: data.status,
        lastInspectionDate: data.lastInspectionDate,
      },
    });
    return NextResponse.json(vessel);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ error: "IMO already exists" }, { status: 400 });
    }
    console.error("FULL ERROR:", e);

  return NextResponse.json(
    {
      error: e.message,
      code: e.code,
      meta: e.meta
    },
    { status: 500 }
  );
  }
}
