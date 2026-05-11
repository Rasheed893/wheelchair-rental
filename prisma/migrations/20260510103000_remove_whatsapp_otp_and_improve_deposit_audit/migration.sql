ALTER TABLE "users"
DROP COLUMN IF EXISTS "whatsappVerifiedAt",
DROP COLUMN IF EXISTS "whatsappOtpHash",
DROP COLUMN IF EXISTS "whatsappOtpExpiresAt",
DROP COLUMN IF EXISTS "whatsappOtpAttempts";

ALTER TABLE "bookings"
DROP COLUMN IF EXISTS "whatsappVerifiedAt",
DROP COLUMN IF EXISTS "whatsappOtpHash",
DROP COLUMN IF EXISTS "whatsappOtpExpiresAt",
DROP COLUMN IF EXISTS "whatsappOtpAttempts";

ALTER TABLE "deposit_audit_logs"
ADD COLUMN "actorName" TEXT,
ADD COLUMN "actorEmail" TEXT,
ADD COLUMN "deductionType" "DepositDeductionType";
