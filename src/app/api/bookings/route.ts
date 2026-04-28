import { bookingService } from "@/services/booking.service";
import { withCustomerAuth, ok, created, badRequest, serverError } from "@/lib/middleware";
import { createBookingSchema } from "@/validators/booking.validator";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

export const GET = withCustomerAuth(async (req, { user }) => {
  try {
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 10);

    const result = await bookingService.getUserBookings(user.id, {
      page,
      pageSize,
    });

    return ok(result);
  } catch (error) {
    return serverError(error);
  }
});

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "bookings:create", user.id),
      limit: 5,
      windowMs: 60_000,
    });
    if (limited) {
      return limited;
    }

    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues[0]?.message ?? "Invalid booking payload",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const booking = await bookingService.create(user.id, parsed.data);
    return created(booking);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid request body");
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
