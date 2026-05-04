import { z } from "zod";
import { DELIVERY_CITIES, DELIVERY_WINDOWS } from "@/lib/delivery";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createBookingSchema = z
  .object({
    wheelchairId: z.string().trim().min(1, "Wheelchair ID is required"),
    startDate: dateString,
    endDate: dateString,
    fullName: z.string().trim().min(2, "Full name is required").max(120),
    phoneNumber: z.string().trim().min(7, "Phone number is required").max(30),
    deliveryCity: z.enum(DELIVERY_CITIES, {
      message: "Delivery city is required",
    }),
    deliveryWindow: z.enum(DELIVERY_WINDOWS, {
      message: "Delivery window is required",
    }),
    deliveryAddress: z
      .string()
      .trim()
      .min(5, "Delivery address is required")
      .max(300, "Delivery address must be 300 characters or fewer"),
    deliveryNotes: z
      .string()
      .trim()
      .max(500, "Notes must be 500 characters or fewer")
      .optional(),
    paymentMethod: z.enum(["ONLINE", "CASH"]).default("ONLINE"),
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
