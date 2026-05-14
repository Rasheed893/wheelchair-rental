-- Password reset tokens are stored as one-way hashes and cleared after use.
ALTER TABLE "users" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_passwordResetTokenHash_key" ON "users"("passwordResetTokenHash");
CREATE INDEX "users_passwordResetExpiresAt_idx" ON "users"("passwordResetExpiresAt");

-- Indexes used by booking dashboards, payment filters, availability checks, and expiry cron.
CREATE INDEX "bookings_wheelchairId_status_startDate_endDate_idx" ON "bookings"("wheelchairId", "status", "startDate", "endDate");
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");
CREATE INDEX "bookings_reservationExpiresAt_idx" ON "bookings"("reservationExpiresAt");
