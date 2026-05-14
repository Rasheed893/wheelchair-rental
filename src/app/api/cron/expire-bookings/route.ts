// src/app/api/cron/expire-bookings/route.ts
// Called by Vercel Cron every 15 minutes
// Add to vercel.json:
// { "crons": [{ "path": "/api/cron/expire-bookings", "schedule": "*/15 * * * *" }] }

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/services/booking.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Protect with a secret header in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    logger.error("[Cron] Missing CRON_SECRET in production", {
      error: "CRON_SECRET is not set",
    });
    return NextResponse.json({ error: "Cron is not configured" }, { status: 500 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await bookingService.expirePendingBookings();
    logger.info(`[Cron] Expired ${count} pending bookings`);
    return NextResponse.json({
      success: true,
      expiredCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[Cron] Failed to expire bookings:", { error: err });
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
