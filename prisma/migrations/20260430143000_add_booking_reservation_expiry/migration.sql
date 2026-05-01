ALTER TYPE "BookingPaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "bookings"
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);
