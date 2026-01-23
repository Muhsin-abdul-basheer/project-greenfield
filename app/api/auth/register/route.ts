import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

/** Public: register as CREW_MEMBER only. Admin must assign vessels before crew can see or report. */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, passwordHash, role: "CREW_MEMBER" },
    });

    return NextResponse.json({ ok: true, message: "Account created. Ask your admin to assign you to vessels before you can report issues." });
  } catch (e) {
    console.error("Register error:", e);
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
