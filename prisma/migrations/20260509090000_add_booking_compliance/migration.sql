CREATE TYPE "IdDocumentType" AS ENUM ('EMIRATES_ID', 'PASSPORT');

ALTER TABLE "users"
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "whatsappVerifiedAt" TIMESTAMP(3),
ADD COLUMN "whatsappOtpHash" TEXT,
ADD COLUMN "whatsappOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN "whatsappOtpAttempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "whatsappVerifiedAt" TIMESTAMP(3),
ADD COLUMN "whatsappOtpHash" TEXT,
ADD COLUMN "whatsappOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN "whatsappOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "idDocumentType" "IdDocumentType",
ADD COLUMN "idDocumentUrl" TEXT,
ADD COLUMN "idDocumentUploadedAt" TIMESTAMP(3);

CREATE INDEX "bookings_whatsappNumber_idx" ON "bookings"("whatsappNumber");
CREATE INDEX "users_whatsappNumber_idx" ON "users"("whatsappNumber");
