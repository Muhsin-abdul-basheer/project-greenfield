import * as jose from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret"
);

export type JWTPayload = {
  sub: string;
  email: string;
  role: "FLEET_ADMIN" | "CREW_MEMBER";
  iat?: number;
  exp?: number;
};

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">) {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const c = await cookies();
  const t = c.get("token")?.value;
  if (!t) return null;
  return verifyToken(t);
}

export async function requireAuth(): Promise<JWTPayload> {
  const s = await getSession();
  if (!s) {
    const e = new Error("Unauthorized") as Error & { status?: number };
    e.status = 401;
    throw e;
  }
  return s;
}

export async function requireAdmin(): Promise<JWTPayload> {
  const s = await requireAuth();
  if (s.role !== "FLEET_ADMIN") {
    const e = new Error("Forbidden") as Error & { status?: number };
    e.status = 403;
    throw e;
  }
  return s;
}

export async function requireCrewOrAdmin(): Promise<JWTPayload> {
  return requireAuth();
}

/** For Crew: check they're assigned to vesselId. Admin bypass. */
export async function canAccessVessel(
  session: JWTPayload,
  vesselId: string
): Promise<boolean> {
  if (session.role === "FLEET_ADMIN") return true;
  const uv = await prisma.userVessel.findUnique({
    where: { userId_vesselId: { userId: session.sub, vesselId } },
  });
  return !!uv;
}
