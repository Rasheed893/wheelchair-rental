-- Add explicit money fields for partial security deposit withholding.
ALTER TABLE "bookings"
ADD COLUMN "depositWithheldAmount" DECIMAL(10,2),
ADD COLUMN "depositRefundAmount" DECIMAL(10,2);

ALTER TABLE "deposit_audit_logs"
ADD COLUMN "withheldAmount" DECIMAL(10,2),
ADD COLUMN "refundAmount" DECIMAL(10,2);
