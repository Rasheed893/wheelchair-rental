// src/app/api/payments/create-intent/route.ts
import {
  withCustomerAuth,
  ok,
  badRequest,
  serverError,
} from "@/lib/middleware";
import { MissingEnvError } from "@/lib/env";
import { paymentService } from "@/services/payment.service";
import { CreatePaymentIntentSchema } from "@/validators/payment.validator";
import { logger } from "@/lib/logger";

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreatePaymentIntentSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues[0]?.message ?? "Booking ID is required",
      );
    }

    const bookingId = parsed.data.bookingId;
    logger.info("CREATE_INTENT_STARTED", { bookingId, userId: user.id });

    const result = await paymentService.createIntent(bookingId, user.id);

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
