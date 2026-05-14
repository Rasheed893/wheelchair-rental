import { NextResponse } from "next/server";
import { getInvoiceRawUrl, normalizeInvoicePublicId } from "@/lib/cloudinary";
import { notFound, serverError, withAdminAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { formatInvoiceFilename } from "@/lib/invoice-format";

export const GET = withAdminAuth(async (_req, { params }) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { bookingId: params.id },
      select: {
        invoiceNumber: true,
        issuedAt: true,
        pdfUrl: true,
      },
    });

    const publicId = normalizeInvoicePublicId(invoice?.pdfUrl);
    if (!invoice || !publicId) {
      return notFound("Invoice");
    }

    const upstream = await fetch(getInvoiceRawUrl(publicId), {
      cache: "no-store",
      headers: { Accept: "application/pdf" },
    });

    if (!upstream.ok) {
      return notFound("Invoice PDF");
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${formatInvoiceFilename(
          invoice.invoiceNumber,
          invoice.issuedAt,
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return serverError(error);
  }
});
