import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin: list crew members for assigning to vessels. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e: unknown) {
    const err = e as { status?: number };
    return NextResponse.json(
      { error: err.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: err.status || 403 }
    );
  }

  const users = await prisma.user.findMany({
    where: { role: "CREW_MEMBER" },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(users);
}
