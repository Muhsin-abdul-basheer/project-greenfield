import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: s.sub },
    select: {
      id: true,
      email: true,
      role: true,
      assignedVessels: { select: { vesselId: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    assignedVesselIds: user.assignedVessels.map((a) => a.vesselId),
  });
}
