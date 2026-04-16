console.log("[REGISTER API HIT]");
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";
import { authService } from "@/services/auth.service";
import { registerSchema } from "@/validators/auth.validator";

import { sendWelcomeEmail } from "@/lib/emails/send-welcome-email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid registration data",
        },
        { status: 400 },
      );
    }

    const result = await authService.register(parsed.data);
    await setAuthCookie(result.token);

    // Send welcome email
    sendWelcomeEmail({
      to: result.user.email,
      name: result.user.name,
    }).catch((err) => {
      console.error("[WELCOME EMAIL ERROR]", err);
    });

    return NextResponse.json(
      { success: true, data: { user: result.user } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "Email already registered"
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 },
      );
    }

    console.error("[Auth Register Error]", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
