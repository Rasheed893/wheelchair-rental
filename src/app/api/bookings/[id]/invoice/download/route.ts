import { NextResponse } from "next/server";
import { invoiceService } from "@/services/invoice.service";
import { withCustomerAuth, notFound, serverError } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export const GET = withCustomerAuth(async (_req, { params, user }) => {
  try {
    const invoice = await invoiceService.getInvoiceDownloadData(
      params.id,
      user.id,
    );
    if (!invoice) {
      return notFound("Invoice");
    }

    const upstream = await fetch(invoice.pdfUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/pdf",
      },
    });

    if (!upstream.ok) {
      logger.warn("[INVOICE DOWNLOAD] storage fetch failed", {
        bookingId: params.id,
        status: upstream.status,
      });
      throw new Error(
        `Failed to fetch invoice PDF from storage: ${upstream.status} ${upstream.statusText}`,
      );
    }

    const pdfBuffer = await upstream.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return serverError(err);
  }
});
