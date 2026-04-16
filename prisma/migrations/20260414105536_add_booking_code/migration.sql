/*
  Warnings:

  - You are about to drop the column `bookingCode` on the `bookings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bookings_bookingCode_idx";

-- DropIndex
DROP INDEX "bookings_bookingCode_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "bookingCode";
