-- Create enums for booking-level payment tracking
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'CASH');
CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- Add delivery-only and payment fields to bookings
ALTER TABLE "bookings"
ADD COLUMN "phoneNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "deliveryNotes" TEXT,
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "paidAt" TIMESTAMP(3),
ALTER COLUMN "deliveryAddress" DROP DEFAULT;

-- Backfill any existing rows to satisfy NOT NULL constraints
UPDATE "bookings" SET "deliveryAddress" = '' WHERE "deliveryAddress" IS NULL;

ALTER TABLE "bookings"
ALTER COLUMN "deliveryAddress" SET NOT NULL;
