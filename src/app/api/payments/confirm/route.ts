import {
  withCustomerAuth,
  badRequest,
  ok,
  serverError,
} from "@/lib/middleware";
import { MissingEnvError } from "@/lib/env";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { paymentService } from "@/services/payment.service";

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "payments:confirm", user.id),
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) {
      return limited;
    }

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

    if (result.processed || result.ignored) {
      return ok(
        result,
        result.ignored
          ? "Payment confirmation was skipped"
          : "Payment confirmation synchronized",
      );
    }

    if (!result.processed) {
      return badRequest(result.reason ?? "Payment not processed");
    }

    return ok(result, "Payment confirmation synchronized");
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid request body");
    }
    if (error instanceof MissingEnvError) {
      return serverError(error, "Payment configuration is missing");
    }
    return serverError(error);
  }
});
