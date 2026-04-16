// src/app/api/auth/me/route.ts
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/middleware";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  return ok({ user });
}
