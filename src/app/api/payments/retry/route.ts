import {
  withCustomerAuth,
  ok,
  badRequest,
  serverError,
} from "@/lib/middleware";
import { MissingEnvError } from "@/lib/env";
import { paymentService } from "@/services/payment.service";
import { CreatePaymentIntentSchema } from "@/validators/payment.validator";

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
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
