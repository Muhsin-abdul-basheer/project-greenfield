import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const bodySchema = z.object({ email: z.string().email("Invalid email") });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
const TOKEN_EXPIRY_HOURS = 1;

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return same message to avoid email enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link was sent to your email." });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetLink = `${APP_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink);

    return NextResponse.json({ message: "If an account exists, a reset link was sent to your email." });
  } catch (e) {
    console.error("Forgot password error:", e);
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
