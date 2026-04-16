// src/types/index.ts

import type {
  User,
  Wheelchair,
  Booking,
  Payment,
  Invoice,
  BookingStatus,
  PaymentStatus,
  WheelchairStatus,
  WheelchairCategory,
  Role,
} from "@prisma/client";

// ─────────────────────────────────────────────
// Re-export Prisma enums for convenience
// ─────────────────────────────────────────────
export {
  BookingStatus,
  PaymentStatus,
  WheelchairStatus,
  WheelchairCategory,
  Role,
};

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export interface JWTPayload {
  sub: string; // userId
  email: string;
  role: Role;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

// ─────────────────────────────────────────────
// API Response wrappers
// ─────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────
// Wheelchair
// ─────────────────────────────────────────────
export type WheelchairPublic = Pick<
  Wheelchair,
  | "id"
  | "name"
  | "nameAr"
  | "description"
  | "descriptionAr"
  | "category"
  | "status"
  | "pricePerDay"
  | "images"
  | "features"
  | "featuresAr"
  | "weight"
  | "maxLoad"
>;

// ─────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────
export type BookingWithRelations = Booking & {
  wheelchair: WheelchairPublic;
  payment?: Payment | null;
  invoice?: Invoice | null;
};

export interface BookingCreateInput {
  wheelchairId: string;
  startDate: string; // ISO date string
  endDate: string;
  notes?: string;
  deliveryAddress?: string;
}

export interface AvailabilityResponse {
  wheelchairId: string;
  unavailableDates: string[]; // ISO date strings
  isAvailable: boolean; // for requested range
}

// ─────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────
export interface CreatePaymentIntentInput {
  bookingId: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

// ─────────────────────────────────────────────
// Admin Dashboard Stats
// ─────────────────────────────────────────────
export interface AdminStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  totalWheelchairs: number;
  availableWheelchairs: number;
  totalUsers: number;
  recentBookings: BookingWithRelations[];
}

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
