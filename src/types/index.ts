import type {
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
import type { DeliveryCity, DeliveryWindow } from "@/lib/delivery";

export {
  BookingStatus,
  PaymentStatus,
  WheelchairStatus,
  WheelchairCategory,
  Role,
};

export interface JWTPayload {
  sub: string;
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

export type WheelchairPublic = Pick<
  Wheelchair,
  | "id"
  | "slug"
  | "name"
  | "nameAr"
  | "description"
  | "descriptionAr"
  | "category"
  | "status"
  | "pricePerDay"
  | "stockQuantity"
  | "images"
  | "features"
  | "featuresAr"
  | "weight"
  | "maxLoad"
>;

type BookingPaymentFields = {
  phoneNumber: string;
  deliveryAddress: string;
  deliveryNotes?: string | null;
  paymentMethod: "ONLINE" | "CASH";
  paymentStatus: "PENDING" | "PAID" | "EXPIRED";
  reservationExpiresAt?: Date | null;
  paidAt?: Date | null;
};

export type BookingWithRelations = Booking & BookingPaymentFields & {
  wheelchair: WheelchairPublic;
  payment?: Payment | null;
  invoice?: Invoice | null;
};

export interface BookingCreateInput {
  wheelchairId: string;
  startDate: string;
  endDate: string;
  fullName: string;
  phoneNumber: string;
  deliveryCity: DeliveryCity;
  deliveryWindow: DeliveryWindow;
  deliveryAddress: string;
  deliveryNotes?: string;
  paymentMethod: "ONLINE" | "CASH";
}

export interface AvailabilityResponse {
  wheelchairId: string;
  unavailableDates: string[];
  isAvailable: boolean;
}

export interface CreatePaymentIntentInput {
  bookingId: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

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
