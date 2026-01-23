import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, canAccessVessel } from "@/lib/auth";

const createSchema = z.object({
  vesselId: z.string().min(1, "Vessel required"),
  category: z.string().min(1, "Category required"),
  description: z.string().min(1, "Description required"),
  priority: z.enum(["Low", "Med", "High"], { errorMap: () => ({ message: "Priority must be Low, Med, or High" }) }),
});

export async function GET(req: NextRequest) {
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

  const vesselId = req.nextUrl.searchParams.get("vesselId");

  try {
    if (vesselId) {
      const ok = await canAccessVessel(session, vesselId);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const issues = await prisma.issue.findMany({
        where: { vesselId },
        include: { vessel: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(issues);
    }

    if (session.role === "FLEET_ADMIN") {
      const issues = await prisma.issue.findMany({
        include: { vessel: { select: { name: true, id: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(issues);
    }

    const issues = await prisma.issue.findMany({
      where: { reportedById: session.sub },
      include: { vessel: { select: { name: true, id: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(issues);
  } catch (e) {
    console.error("GET /api/issues", e);
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

  if (session.role !== "CREW_MEMBER") {
    return NextResponse.json({ error: "Forbidden: only crew can report issues" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const ok = await canAccessVessel(session, parsed.data.vesselId);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden: vessel not assigned" }, { status: 403 });
  }

  try {
    const issue = await prisma.issue.create({
      data: {
        vesselId: parsed.data.vesselId,
        category: parsed.data.category,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: "Open",
        reportedById: session.sub,
      },
      include: { vessel: { select: { name: true } } },
    });
    return NextResponse.json(issue);
  } catch (e) {
    console.error("POST /api/issues", e);
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
