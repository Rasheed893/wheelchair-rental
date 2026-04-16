// src/app/api/admin/bookings/[id]/route.ts
import { NextRequest } from "next/server";
import { bookingService } from "@/services/booking.service";
import {
  withAdminAuth,
  ok,
  badRequest,
  notFound,
  serverError,
} from "@/lib/middleware";

type Ctx = { params: { id: string } };

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
    const booking = await bookingService.cancel(
      params.id,
      user.id,
      body.reason ?? "Cancelled by admin",
      true, // isAdmin = true
    );
    return ok(booking);
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return serverError(err);
  }
});
