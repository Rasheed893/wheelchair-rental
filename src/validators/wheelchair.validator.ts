// ─────────────────────────────────────────────
// src/validators/wheelchair.validator.ts
// ─────────────────────────────────────────────
import { WheelchairCategory, WheelchairStatus } from "@prisma/client";
import { z as z2 } from "zod";

export const createWheelchairSchema = z2.object({
  name: z2.string().min(2).max(100),
  nameAr: z2.string().min(2).max(100),
  description: z2.string().min(10).max(1000),
  descriptionAr: z2.string().min(10).max(1000),
  category: z2.nativeEnum(WheelchairCategory),
  status: z2.nativeEnum(WheelchairStatus).optional(),
  pricePerDay: z2.number().positive().multipleOf(0.01),
  stockQuantity: z2.number().int().min(1).default(1),
  images: z2.array(z2.string().url()).min(1, "At least one image is required"),
  features: z2.array(z2.string()).default([]),
  featuresAr: z2.array(z2.string()).default([]),
  weight: z2.number().positive().optional(),
  maxLoad: z2.number().positive().optional(),
  serialNumber: z2.string().min(3).max(50),
});

export const updateWheelchairSchema = createWheelchairSchema.partial();

export type CreateWheelchairInput = z2.infer<typeof createWheelchairSchema>;
export type UpdateWheelchairInput = z2.infer<typeof updateWheelchairSchema>;
