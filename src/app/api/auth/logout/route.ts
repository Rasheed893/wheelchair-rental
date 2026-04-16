// src/app/api/auth/logout/route.ts
import { clearAuthCookie } from "@/lib/auth";
import { ok } from "@/lib/middleware";

export async function POST() {
  await clearAuthCookie();
  return ok(null, "Logged out successfully");
}
