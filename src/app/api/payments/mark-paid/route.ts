import { logger } from "@/lib/logger";
import { withAdminAuth, badRequest, ok, serverError } from "@/lib/middleware";
import { paymentService } from "@/services/payment.service";

export const POST = withAdminAuth(async (req) => {
  try {
    // console.log("[MARK PAID] route hit");
    const body = await req.json();
    const bookingId =
      typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    logger.info("[MARK PAID] bookingId", bookingId);

    if (!bookingId) {
      console.warn("[MARK PAID] missing bookingId in request body");
      return badRequest("bookingId is required");
    }

    // console.log("[MARK PAID] calling paymentService.markCashBookingPaidForAdmin");
    const result = await paymentService.markCashBookingPaidForAdmin(bookingId);
    logger.info("[MARK PAID] service result", {
      bookingId,
      updated: result.updated,
      bookingPaymentStatus: result.booking?.paymentStatus,
    });
    return ok(
      result,
      result.updated ? "Booking marked as paid" : "Booking is already paid",
    );
  } catch (error) {
    console.error("[MARK PAID] route error", error);
    if (error instanceof SyntaxError) {
      return badRequest("Invalid request body");
    }
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
});
