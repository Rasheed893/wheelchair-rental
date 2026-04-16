// src/app/api/cron/expire-bookings/route.ts
// Called by Vercel Cron every 15 minutes
// Add to vercel.json:
// { "crons": [{ "path": "/api/cron/expire-bookings", "schedule": "*/15 * * * *" }] }

import { NextRequest, NextResponse } from "next/server";
import { bookingService } from "@/services/booking.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Protect with a secret header in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await bookingService.expireStaleBookings();
    console.log(`[Cron] Expired ${count} stale bookings`);
    return NextResponse.json({
      success: true,
      expiredCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] Failed to expire bookings:", err);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
