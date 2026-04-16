// src/app/api/bookings/[id]/invoice/route.ts
import { NextRequest } from "next/server";
import { invoiceService } from "@/services/invoice.service";
import { withCustomerAuth, ok, notFound, serverError } from "@/lib/middleware";

type Ctx = { params: { id: string } };

// GET /api/bookings/:id/invoice
export const GET = withCustomerAuth(async (_req, { params, user }) => {
  try {
    const invoice = await invoiceService.getByBooking(params.id, user.id);
    if (!invoice) return notFound("Invoice");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
});
