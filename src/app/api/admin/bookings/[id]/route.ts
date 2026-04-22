// src/app/api/admin/bookings/[id]/route.ts
import { bookingService } from "@/services/booking.service";
import {
  withAdminAuth,
  ok,
  badRequest,
  notFound,
  serverError,
} from "@/lib/middleware";
import type { BookingStatus } from "@prisma/client";

// GET /api/admin/bookings/:id — Admin view single booking
export const GET = withAdminAuth(async (_req, { params }) => {
  try {
    const booking = await bookingService.getById(params.id);
    if (!booking) return notFound("Booking");
    return ok(booking);
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/admin/bookings/:id — Admin cancel booking
export const PATCH = withAdminAuth(async (req, { params, user }) => {
  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "cancel";

    const booking =
      action === "update-status"
        ? await bookingService.adminUpdateStatus(
            params.id,
            body.status as BookingStatus,
          )
        : await bookingService.cancel(
            params.id,
            user.id,
            body.reason ?? "Cancelled by admin",
            true,
          );

    return ok(booking);
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return serverError(err);
  }
});
