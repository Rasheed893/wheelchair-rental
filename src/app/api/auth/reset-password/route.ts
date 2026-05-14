// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(32, "Reset token is invalid").max(256),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "auth:reset-password"),
      limit: 5,
      windowMs: 60_000,
    });
    if (limited) {
      return limited;
    }

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

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Reset link is invalid or expired" },
        { status: 401 },
      );
    }

    // Hash new password
    const newPasswordHash = await hash(parsed.data.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error("[Reset Password Error]", { error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
