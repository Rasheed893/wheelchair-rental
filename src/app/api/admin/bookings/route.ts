// src/app/api/admin/bookings/route.ts
import { bookingService } from "@/services/booking.service";
import { withAdminAuth, ok, serverError } from "@/lib/middleware";
import type { BookingPaymentStatus, BookingStatus } from "@prisma/client";

export const GET = withAdminAuth(async (req) => {
  try {
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);
    const status = searchParams.get("status") as BookingStatus | null;
    const paymentStatus = searchParams.get("paymentStatus") as
      | BookingPaymentStatus
      | null;
    const whatsappVerification = searchParams.get("whatsappVerification") as
      | "VERIFIED"
      | "NOT_VERIFIED"
      | null;
    const query = searchParams.get("query")?.trim() ?? "";

    const result = await bookingService.adminList(
      {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(whatsappVerification ? { whatsappVerification } : {}),
        ...(query ? { query } : {}),
      },
      {
        page,
        pageSize,
      },
    );
    return ok(result);
  } catch (err) {
    return serverError(err);
  }
});
