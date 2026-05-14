// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/emails/send-password-reset-email";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/password-reset";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address").max(254),
});

function getAppBaseUrl() {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_URL or VERCEL_URL is required for password reset links");
  }

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "auth:forgot-password"),
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
          error: parsed.error.issues[0]?.message ?? "Invalid email",
        },
        { status: 400 },
      );
    }

    const appBaseUrl = getAppBaseUrl();
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    const resetToken = createPasswordResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetToken.tokenHash,
        passwordResetExpiresAt: resetToken.expiresAt,
      },
    });

    const resetUrl = `${appBaseUrl}/en/auth/reset-password?token=${resetToken.token}`;

    // Send password reset email
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink: resetUrl,
      locale: "en", // Could be determined from user preference
    }).catch((err) => {
      logger.error("[RESET EMAIL ERROR]", { userId: user.id, error: err });
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    logger.error("[Forgot Password Error]", { error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
