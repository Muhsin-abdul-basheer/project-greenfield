import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z
  .object({
    token: z.string().min(1, "Token required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { token, newPassword } = parsed.data;

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired reset link. Request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (e) {
    console.error("Reset password error:", e);
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
