import { NextResponse } from "next/server";
import {
  BookingValidationError,
  bookingService,
  type BookingValidationErrorCode,
} from "@/services/booking.service";
import { withCustomerAuth, ok, created, serverError } from "@/lib/middleware";
import { createBookingSchema } from "@/validators/booking.validator";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

type BookingApiErrorCode = BookingValidationErrorCode | "INVALID_INPUT";

function bookingFailureResponse({
  status,
  code,
  message,
  details,
}: {
  status: 400 | 409 | 500;
  code: BookingApiErrorCode | "INTERNAL_SERVER_ERROR";
  message: string;
  details?: Record<string, string[]>;
}) {
  return NextResponse.json(
    { success: false, code, message, error: message, details },
    { status },
  );
}

function getSchemaErrorCode(path: string[]): {
  code: BookingApiErrorCode;
  status: 400 | 409;
} {
  const field = path[0];

  if (field === "startDate" || field === "endDate") {
    return { code: "INVALID_DATE", status: 409 };
  }

  if (field === "termsAccepted" || field === "termsVersion") {
    return { code: "TERMS_NOT_ACCEPTED", status: 400 };
  }

  if (field === "wheelchairId") {
    return { code: "INVALID_WHEELCHAIR", status: 400 };
  }

  if (field?.startsWith("idDocument")) {
    return { code: "INVALID_ID_DOCUMENT", status: 400 };
  }

  return { code: "INVALID_INPUT", status: 400 };
}

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
      if (typeof body?.idDocumentUrl === "string") {
        await bookingService.cleanupFailedBookingIdDocumentUpload({
          idDocumentUrl: body.idDocumentUrl,
          userId: user.id,
        });
      }

      const firstIssue = parsed.error.issues[0];
      const { code, status } = getSchemaErrorCode(
        firstIssue?.path.map(String) ?? [],
      );
      const message = firstIssue?.message ?? "Invalid booking payload";

      logger.warn(`[BOOKING VALIDATION] ${code}`, {
        userId: user.id,
        path: firstIssue?.path,
      });

      return bookingFailureResponse({
        status,
        code,
        message,
        details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }

    const booking = await bookingService.create(user.id, parsed.data);
    return created(booking);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn("[BOOKING VALIDATION] INVALID_INPUT", { userId: user.id });
      return bookingFailureResponse({
        status: 400,
        code: "INVALID_INPUT",
        message: "Invalid request body",
      });
    }

    if (error instanceof BookingValidationError) {
      logger.warn(`[BOOKING VALIDATION] ${error.code}`, {
        userId: user.id,
      });
      return bookingFailureResponse({
        status: error.status,
        code: error.code,
        message: error.message,
      });
    }

    logger.error("[BOOKING ERROR]", { userId: user.id, error });
    return bookingFailureResponse({
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  }
});
