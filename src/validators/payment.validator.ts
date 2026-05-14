import { z } from "zod";

const requiredString = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(191, `${fieldName} is too long`);

const dateField = (fieldName: string) =>
  z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: `${fieldName} must be a valid date`,
  });

const positivePrice = z.coerce
  .number()
  .finite("Total price must be a valid number")
  .positive("Total price must be greater than 0");

const bookingBaseSchema = z.object({
  wheelchairId: requiredString("Wheelchair ID"),
  userId: requiredString("User ID"),
  startDate: dateField("Start date"),
  endDate: dateField("End date"),
  totalPrice: positivePrice,
});

export const BookingSchema = bookingBaseSchema.superRefine((data, ctx) => {
  if (data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date",
    });
  }
});

export const CreatePaymentSchema = bookingBaseSchema.superRefine((data, ctx) => {
  if (data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date",
    });
  }
});

export const CreatePaymentIntentSchema = z.object({
  bookingId: requiredString("Booking ID"),
});

export const ConfirmPaymentIntentSchema = z.object({
  paymentIntentId: requiredString("PaymentIntent ID"),
  bookingId: requiredString("Booking ID").optional(),
});

export type BookingInput = z.infer<typeof BookingSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;
export type ConfirmPaymentIntentInput = z.infer<typeof ConfirmPaymentIntentSchema>;

export const createPaymentSafeParseExample = (input: unknown) =>
  CreatePaymentSchema.safeParse(input);
