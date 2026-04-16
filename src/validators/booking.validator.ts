import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createBookingSchema = z
  .object({
    wheelchairId: z.string().trim().min(1, "Wheelchair ID is required"),
    startDate: dateString,
    endDate: dateString,
    notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
    deliveryAddress: z
      .string()
      .max(300, "Delivery address must be 300 characters or fewer")
      .optional(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const cancelBookingSchema = z.object({
  reason: z.string().max(500, "Reason must be 500 characters or fewer").optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;