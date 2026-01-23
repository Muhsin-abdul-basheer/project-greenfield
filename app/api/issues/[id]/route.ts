import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin, canAccessVessel } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum(["Open", "Resolved"]).optional(),
  recommendation: z.union([z.string(), z.null()]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { vessel: { select: { id: true, name: true } } },
  });
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  if (session.role === "FLEET_ADMIN") {
    return NextResponse.json(issue);
  }

  const ok = await canAccessVessel(session, issue.vesselId);
  if (!ok && issue.reportedById !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(issue);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireAdmin();
  } catch (e: unknown) {
    const err = e as { status?: number };
    return NextResponse.json(
      { error: err.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: err.status || 403 }
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
  if (d.status != null) update.status = d.status;
  if (d.recommendation !== undefined) update.recommendation = d.recommendation;

  if (Object.keys(update).length === 0) {
    const issue = await prisma.issue.findUniqueOrThrow({ where: { id }, include: { vessel: { select: { name: true } } } });
    return NextResponse.json(issue);
  }

  try {
    const issue = await prisma.issue.update({
      where: { id },
      data: update,
      include: { vessel: { select: { name: true } } },
    });
    return NextResponse.json(issue);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
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
