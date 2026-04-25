// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return new TextEncoder().encode("fallback-dev-secret-change-in-production");
  }

  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    // Verify token
    let payload;
    try {
      const result = await jwtVerify(parsed.data.token, getJwtSecret());
      payload = result.payload as any;
    } catch {
      return NextResponse.json(
        { success: false, error: "Reset link is invalid or expired" },
        { status: 401 },
      );
    }

    // Check token type
    if (payload.type !== "password-reset") {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 },
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Hash new password
    const newPasswordHash = await hash(parsed.data.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("[Reset Password Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
