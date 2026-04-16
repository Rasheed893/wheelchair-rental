// src/app/api/bookings/[id]/route.ts
import { NextRequest } from "next/server";
import { bookingService } from "@/services/booking.service";
import { cancelBookingSchema } from "@/validators/booking.validator";
import {
  withCustomerAuth,
  ok,
  badRequest,
  notFound,
  serverError,
} from "@/lib/middleware";

type Ctx = { params: { id: string } };

// GET /api/bookings/:id
export const GET = withCustomerAuth(async (_req, { params, user }) => {
  try {
    const booking = await bookingService.getById(params.id, user.id);
    if (!booking) return notFound("Booking");
    return ok(booking);
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/bookings/:id — Cancel booking
export const PATCH = withCustomerAuth(async (req, { params, user }) => {
  try {
    const body = await req.json();
    const parsed = cancelBookingSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Validation failed");
    }

    const booking = await bookingService.cancel(
      params.id,
      user.id,
      parsed.data.reason,
      false,
    );
    return ok(booking);
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return serverError(err);
  }
});
