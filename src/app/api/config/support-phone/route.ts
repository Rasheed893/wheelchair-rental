import { ok } from "@/lib/middleware";

export async function GET() {
  return ok({
    supportPhone: process.env.SUPPORT_PHONE || "",
  });
}

