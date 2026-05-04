import { prisma } from "@/lib/prisma";
import cloudinary, {
  buildInvoicePublicId,
  getInvoiceRawUrl,
  normalizeInvoicePublicId,
} from "@/lib/cloudinary";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import {
  buildAbsoluteInvoiceDownloadUrl,
  formatInvoiceFilename,
} from "@/lib/invoice-format";
import { Prisma } from "@prisma/client";
import type { Invoice } from "@prisma/client";
import {
  VAT_RATE,
  calculateBookingPricing,
  calculateTax,
  calculateTotal,
  roundCurrency,
} from "@/lib/pricing";

const CURRENCY = "aed";
const PDF_SIGNATURE = Buffer.from("%PDF");

type InvoiceMetadata = {
  invoiceGeneratedAt?: string;
  [key: string]: unknown;
};

type InvoiceDownloadPayload = Invoice & {
  downloadUrl: string;
  filename: string;
};

export class InvoiceService {
  private readonly TAX_RATE = VAT_RATE;

  async generate(bookingId: string, userId: string): Promise<Invoice> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true } },
        wheelchair: true,
        payment: true,
        invoice: true,
      },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.userId !== userId)
      throw new Error("Booking does not belong to the user");
    if (booking.paymentStatus !== "PAID") {
      throw new Error(
        "Invoice can only be generated after payment is confirmed",
      );
    }

    const invoice =
      booking.invoice ??
      (await this.createInvoiceRecord(
        bookingId,
        userId,
        calculateBookingPricing(
          booking.totalDays,
          Number(booking.wheelchair.pricePerDay),
          this.TAX_RATE,
        ).subtotal,
        booking.payment?.amount,
      ));

    if (invoice.pdfUrl) {
      const normalizedPublicId = normalizeInvoicePublicId(invoice.pdfUrl);
      if (!normalizedPublicId) {
        throw new Error("Stored invoice PDF reference is invalid");
      }

      if (normalizedPublicId !== invoice.pdfUrl) {
        const migratedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl: normalizedPublicId },
        });
        await this.markInvoiceGeneratedMetadata(bookingId);
        return migratedInvoice;
      }

      await this.markInvoiceGeneratedMetadata(bookingId);
      return invoice;
    }

    const pdfBytes = await buildInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      bookingId: booking.id,
      customerName: booking.user.name,
      phoneNumber: booking.phoneNumber,
      deliveryAddress: booking.deliveryAddress,
      deliveryNotes: booking.deliveryNotes ?? undefined,
      wheelchairName: booking.wheelchair.name,
      startDate: booking.startDate,
      endDate: booking.endDate,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
    });

    const pdfBuffer = this.assertValidPdfBuffer(Buffer.from(pdfBytes));
    const publicId = await this.uploadPdf({
      bookingId,
      issuedAt: invoice.issuedAt,
      pdfBuffer,
    });

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: publicId },
    });

    await this.markInvoiceGeneratedMetadata(bookingId);

    return updatedInvoice;
  }

  async getByBooking(
    bookingId: string,
    userId: string,
  ): Promise<InvoiceDownloadPayload | null> {
    const invoice = await prisma.invoice.findFirst({
      where: { bookingId, userId },
    });

    if (!invoice) {
      return null;
    }

    return {
      ...invoice,
      pdfUrl: invoice.pdfUrl
        ? this.getInvoiceDeliveryUrl(invoice.pdfUrl)
        : invoice.pdfUrl,
      downloadUrl: buildAbsoluteInvoiceDownloadUrl(
        `/api/bookings/${bookingId}/invoice/download`,
      ),
      filename: formatInvoiceFilename(invoice.invoiceNumber, invoice.issuedAt),
    };
  }

  async getInvoiceDownloadData(
    bookingId: string,
    userId: string,
  ): Promise<{
    invoiceNumber: string;
    pdfUrl: string;
    filename: string;
    downloadUrl: string;
  } | null> {
    const invoice = await prisma.invoice.findFirst({
      where: { bookingId, userId },
      select: {
        invoiceNumber: true,
        pdfUrl: true,
        issuedAt: true,
      },
    });

    if (!invoice?.pdfUrl) {
      return null;
    }

    return {
      invoiceNumber: invoice.invoiceNumber,
      pdfUrl: this.getInvoiceDeliveryUrl(invoice.pdfUrl),
      filename: formatInvoiceFilename(invoice.invoiceNumber, invoice.issuedAt),
      downloadUrl: buildAbsoluteInvoiceDownloadUrl(
        `/api/bookings/${bookingId}/invoice/download`,
      ),
    };
  }

  private async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const counter = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceCounter.findUnique({ where: { id: 1 } });

      if (!existing || existing.year !== year) {
        return tx.invoiceCounter.upsert({
          where: { id: 1 },
          create: { id: 1, year, count: 1 },
          update: { year, count: 1 },
        });
      }

      return tx.invoiceCounter.update({
        where: { id: 1 },
        data: { count: { increment: 1 } },
      });
    });

    const paddedCount = String(counter.count).padStart(6, "0");
    return `INV-${year}-${paddedCount}`;
  }

  private async createInvoiceRecord(
    bookingId: string,
    userId: string,
    bookingTotalPrice: Prisma.Decimal | number,
    paymentAmount?: Prisma.Decimal | null,
    attempt = 0,
  ): Promise<Invoice> {
    const subtotal = roundCurrency(Number(bookingTotalPrice));
    const expectedTaxAmount = calculateTax(subtotal, this.TAX_RATE);
    const expectedTotalAmount = calculateTotal(subtotal, this.TAX_RATE);
    const chargedTotal = paymentAmount
      ? roundCurrency(Number(paymentAmount))
      : expectedTotalAmount;
    const taxAmount = roundCurrency(
      Math.max(chargedTotal - subtotal, expectedTaxAmount),
    );
    const totalAmount = chargedTotal;

    try {
      return await prisma.invoice.create({
        data: {
          invoiceNumber: await this.getNextInvoiceNumber(),
          bookingId,
          userId,
          subtotal,
          taxRate: this.TAX_RATE,
          taxAmount,
          totalAmount,
          currency: CURRENCY,
          issuedAt: new Date(),
          dueAt: new Date(),
        },
      });
    } catch (error) {
      const existing = await prisma.invoice.findUnique({
        where: { bookingId },
      });
      if (existing) {
        return existing;
      }

      if (
        attempt < 3 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return this.createInvoiceRecord(
          bookingId,
          userId,
          bookingTotalPrice,
          paymentAmount,
          attempt + 1,
        );
      }

      throw error;
    }
  }

  private assertValidPdfBuffer(pdfBuffer: Buffer): Buffer {
    if (pdfBuffer.length < 512) {
      throw new Error("Generated invoice PDF is too small and appears invalid");
    }

    if (!pdfBuffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      throw new Error("Generated invoice PDF is corrupted");
    }

    return pdfBuffer;
  }

  private async uploadPdf({
    bookingId,
    issuedAt,
    pdfBuffer,
  }: {
    bookingId: string;
    issuedAt: Date;
    pdfBuffer: Buffer;
  }): Promise<string> {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error("Cloudinary is not configured for invoice uploads");
    }

    const year = new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Dubai",
    }).format(issuedAt);

    const publicId = buildInvoicePublicId(year, bookingId);

    const result = await new Promise<{ public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            type: "upload",
            access_mode: "public",
            public_id: publicId,
            format: "pdf",
            use_filename: false,
            unique_filename: false,
            overwrite: true,
            invalidate: true,
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
              return;
            }

            if (!uploadResult?.public_id) {
              reject(
                new Error("Cloudinary invoice upload did not return a public ID"),
              );
              return;
            }

            resolve({ public_id: uploadResult.public_id });
          },
        );

        stream.end(pdfBuffer);
      },
    );

    return result.public_id;
  }

  private getInvoiceDeliveryUrl(storedValue: string) {
    const publicId = normalizeInvoicePublicId(storedValue);
    if (!publicId) {
      throw new Error("Stored invoice PDF reference is invalid");
    }

    return getInvoiceRawUrl(publicId);
  }

  private async markInvoiceGeneratedMetadata(bookingId: string) {
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      select: { metadata: true },
    });

    if (!payment) {
      return;
    }

    const metadata = this.getInvoiceMetadata(payment.metadata);
    if (metadata.invoiceGeneratedAt) {
      return;
    }

    await prisma.payment.update({
      where: { bookingId },
      data: {
        metadata: {
          ...(metadata as Prisma.InputJsonObject),
          invoiceGeneratedAt: new Date().toISOString(),
        },
      },
    });
  }

  private getInvoiceMetadata(metadata: unknown): InvoiceMetadata {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
      return {};
    }

    return metadata as InvoiceMetadata;
  }

  async adminList(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          booking: { include: { wheelchair: { select: { name: true } } } },
        },
        orderBy: { issuedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.invoice.count(),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const invoiceService = new InvoiceService();
