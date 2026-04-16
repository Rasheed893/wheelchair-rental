// src/app/api/payments/create-intent/route.ts
import {
  withCustomerAuth,
  ok,
  badRequest,
  serverError,
} from "@/lib/middleware";
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

    const bookingId = parsed.data.bookingId;
    console.log("[CREATE INTENT] bookingId:", bookingId);
    console.log("[CREATE INTENT] userId:", user.id);
    console.log("[CREATE INTENT] BODY:", body);

    const result = await paymentService.createIntent(bookingId, user.id);

    return ok(result);
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
