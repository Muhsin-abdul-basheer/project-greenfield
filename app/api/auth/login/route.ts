import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const role = user.role as "FLEET_ADMIN" | "CREW_MEMBER";
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role,
    });

    const res = NextResponse.json({ token, user: { id: user.id, email: user.email, role } });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("Login error:", e);
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
