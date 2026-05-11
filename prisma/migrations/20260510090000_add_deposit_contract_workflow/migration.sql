CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'COLLECTED', 'REFUNDED', 'PARTIALLY_WITHHELD');

CREATE TYPE "DepositDeductionType" AS ENUM (
  'PHYSICAL_DAMAGE',
  'LOST_CHARGER',
  'MISSING_ACCESSORIES',
  'BATTERY_DAMAGE',
  'THEFT_OR_LOSS',
  'OTHER'
);

ALTER TABLE "bookings"
ADD COLUMN "securityDeposit" DECIMAL(10, 2) NOT NULL DEFAULT 500,
ADD COLUMN "depositStatus" "DepositStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "depositCollectedAt" TIMESTAMP(3),
ADD COLUMN "depositRefundedAt" TIMESTAMP(3),
ADD COLUMN "depositDeductionType" "DepositDeductionType",
ADD COLUMN "depositDeductionReason" TEXT,
ADD COLUMN "depositCollectedBy" TEXT,
ADD COLUMN "depositRefundedBy" TEXT,
ADD COLUMN "contractPdfUrl" TEXT;

UPDATE "bookings" AS b
SET "securityDeposit" = CASE
  WHEN UPPER(w."name") LIKE '%SCOOTER%' THEN 1000
  WHEN UPPER(w."name") LIKE '%ELECTRIC%' THEN 1000
  WHEN w."category"::TEXT = 'ELECTRIC' THEN 1000
  ELSE 500
END
FROM "wheelchairs" AS w
WHERE b."wheelchairId" = w."id";

CREATE TABLE "deposit_audit_logs" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "oldStatus" "DepositStatus",
  "newStatus" "DepositStatus",
  "adminId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deposit_audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "deposit_audit_logs"
ADD CONSTRAINT "deposit_audit_logs_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "bookings_depositStatus_idx" ON "bookings"("depositStatus");
CREATE INDEX "deposit_audit_logs_bookingId_idx" ON "deposit_audit_logs"("bookingId");
CREATE INDEX "deposit_audit_logs_adminId_idx" ON "deposit_audit_logs"("adminId");
CREATE INDEX "deposit_audit_logs_createdAt_idx" ON "deposit_audit_logs"("createdAt");
