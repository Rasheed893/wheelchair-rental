import { invoiceService } from "@/services/invoice.service";
import { withCustomerAuth, ok, notFound, serverError } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

// GET /api/bookings/:id/invoice
// src/app/api/bookings/[id]/invoice/route.ts
export const GET = withCustomerAuth(async (_req, { params, user }) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!booking) return notFound("Booking");

    // Only generate for confirmed/paid bookings
    if (["CONFIRMED", "COMPLETED"].includes(booking.status)) {
      await invoiceService.generate(params.id, user.id);
      const invoice = await invoiceService.getByBooking(params.id, user.id);
      if (!invoice) return notFound("Invoice");
      return ok(invoice);
    }

    const invoice = await invoiceService.getByBooking(params.id, user.id);
    if (!invoice) return notFound("Invoice");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
});
// export const GET = withCustomerAuth(async (_req, { params, user }) => {
//   try {
//     const invoice = await invoiceService.getByBooking(params.id, user.id);
//     if (!invoice) return notFound("Invoice");
//     return ok(invoice);
//   } catch (err) {
//     return serverError(err);
//   }
// });
