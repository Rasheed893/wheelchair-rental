import {
  withCustomerAuth,
  badRequest,
  ok,
  serverError,
} from "@/lib/middleware";
import { paymentService } from "@/services/payment.service";

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const paymentIntentId =
      typeof body?.paymentIntentId === "string" ? body.paymentIntentId : "";
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";

    if (!paymentIntentId) {
      return badRequest("paymentIntentId is required");
    }

    const result = await paymentService.confirmPaymentIntentForUser(
      paymentIntentId,
      user.id,
      bookingId || undefined,
    );

    if (!result.processed) {
      return badRequest(result.reason ?? "Payment not processed");
    }

    return ok(result, "Payment confirmation synchronized");
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid request body");
    }
    return serverError(error);
  }
});
