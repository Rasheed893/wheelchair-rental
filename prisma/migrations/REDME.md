-- prisma/migrations/README.md
-- This file documents the initial migration.
-- Run `npx prisma migrate dev --name init` to auto-generate the actual SQL migration.

-- The migration will create these tables in order:
-- 1. users
-- 2. wheelchairs
-- 3. bookings (FK → users, wheelchairs)
-- 4. payments (FK → bookings)
-- 5. invoices (FK → bookings, users)
-- 6. invoice_counters

-- Key indexes created:
-- users: idx on email, role
-- wheelchairs: idx on status, category, pricePerDay
-- bookings: composite idx on (wheelchairId, startDate, endDate)
-- idx on userId, status, startDate, endDate
-- payments: idx on stripePaymentIntentId, status
-- invoices: idx on userId, invoiceNumber, issuedAt

-- Availability query (used in booking.service.ts overlap check):
-- SELECT \* FROM bookings
-- WHERE "wheelchairId" = $1
-- AND status IN ('PENDING', 'CONFIRMED')
-- AND "startDate" <= $endDate
-- AND "endDate" >= $startDate
-- LIMIT 1;
-- This query uses the composite index (wheelchairId, startDate, endDate)
