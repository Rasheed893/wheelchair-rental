-- CreateEnum
CREATE TYPE "DeliveryCity" AS ENUM ('DUBAI', 'SHARJAH', 'AJMAN', 'UAQ', 'ABU_DHABI', 'RAK', 'FUJAIRAH', 'AL_AIN');

-- CreateEnum
CREATE TYPE "DeliveryWindow" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- AlterTable
ALTER TABLE "bookings"
ADD COLUMN "deliveryCity" "DeliveryCity",
ADD COLUMN "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "deliveryWindow" "DeliveryWindow";

UPDATE "bookings"
SET
  "deliveryCity" = 'DUBAI',
  "deliveryWindow" = 'MORNING',
  "deliveryFee" = 0
WHERE "deliveryCity" IS NULL
   OR "deliveryWindow" IS NULL;

ALTER TABLE "bookings"
ALTER COLUMN "deliveryCity" SET NOT NULL,
ALTER COLUMN "deliveryWindow" SET NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "taxRate" SET DEFAULT 0.05;
