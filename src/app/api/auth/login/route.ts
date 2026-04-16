import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";
import { authService } from "@/services/auth.service";
import { loginSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ?? "Email and password are required",
        },
        { status: 400 },
      );
    }

    const result = await authService.login(parsed.data);
    await setAuthCookie(result.token);

    return NextResponse.json({ success: true, data: { user: result.user } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "Invalid email or password") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 },
      );
    }

    console.error("[Auth Login Error]", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}