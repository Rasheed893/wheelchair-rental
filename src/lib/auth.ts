import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AuthUser, JWTPayload } from "@/types";

const COOKIE_NAME = "wr_token";
const EXPIRES_IN = "7d";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is not set");
    }

    return new TextEncoder().encode("fallback-dev-secret-change-in-production");
  }

  return new TextEncoder().encode(secret);
}

function isRole(value: unknown): value is AuthUser["role"] {
  return value === "CUSTOMER" || value === "ADMIN";
}

function isValidPayload(payload: Record<string, unknown>): payload is Omit<
  JWTPayload,
  "iat" | "exp"
> &
  Partial<Pick<JWTPayload, "iat" | "exp">> {
  return (
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    typeof payload.name === "string" &&
    isRole(payload.role)
  );
}

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (!isValidPayload(payload)) {
      return null;
    }

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export { COOKIE_NAME };