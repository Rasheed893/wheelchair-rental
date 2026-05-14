import { invoiceService } from "@/services/invoice.service";
import { withCustomerAuth, ok, badRequest, notFound, serverError } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const INVOICE_PENDING_MESSAGE = "Invoice is available after payment is confirmed.";

// GET /api/bookings/:id/invoice
// src/app/api/bookings/[id]/invoice/route.ts
export const GET = withCustomerAuth(async (_req, { params, user }) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!booking) return notFound("Booking");

    if (booking.paymentStatus !== "PAID") {
      return badRequest(INVOICE_PENDING_MESSAGE);
    }

    if (["CONFIRMED", "COMPLETED", "DELIVERED"].includes(booking.status)) {
      await invoiceService.generate(params.id, user.id);
      const invoice = await invoiceService.getByBooking(params.id, user.id);
      if (!invoice) return notFound("Invoice");
      return ok(invoice);
    }

    const invoice = await invoiceService.getByBooking(params.id, user.id);
    if (!invoice) return notFound("Invoice");
    return ok(invoice);
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "Invoice can only be generated after payment is confirmed"
    ) {
      return badRequest(INVOICE_PENDING_MESSAGE);
    }

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
