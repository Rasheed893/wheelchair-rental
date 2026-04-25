// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/emails/send-password-reset-email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return new TextEncoder().encode("fallback-dev-secret-change-in-production");
  }

  return new TextEncoder().encode(secret);
}

async function generateResetToken(userId: string) {
  return new SignJWT({ sub: userId, type: "password-reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h") // Token valid for 1 hour
    .sign(getJwtSecret());
}

export async function POST(req: NextRequest) {
  try {
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

    // Generate reset token
    const resetToken = await generateResetToken(user.id);

    // Build reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/en/auth/reset-password?token=${resetToken}`;

    // Send password reset email
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink: resetUrl,
      locale: "en", // Could be determined from user preference
    }).catch((err) => {
      console.error("[RESET EMAIL ERROR]", err);
      // Don't fail the request, just log the error
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("[Forgot Password Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
