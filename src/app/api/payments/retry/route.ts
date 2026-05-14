import {
  withCustomerAuth,
  ok,
  badRequest,
  serverError,
} from "@/lib/middleware";
import { MissingEnvError } from "@/lib/env";
import { paymentService } from "@/services/payment.service";
import { CreatePaymentIntentSchema } from "@/validators/payment.validator";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "payments:retry", user.id),
      limit: 5,
      windowMs: 60_000,
    });
    if (limited) {
      return limited;
    }

    const body = await req.json();
    const parsed = CreatePaymentIntentSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues[0]?.message ?? "Booking ID is required",
      );
    }

    const result = await paymentService.retryPayment(parsed.data.bookingId, user.id);
    return ok(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid request body");
    }

    if (error instanceof MissingEnvError) {
      return serverError(error, "Payment configuration is missing");
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
