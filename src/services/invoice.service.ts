import { prisma } from "@/lib/prisma";
import type { Invoice } from "@prisma/client";
import { VAT_RATE, calculateTax, calculateTotal, roundCurrency } from "@/lib/pricing";

const CURRENCY = "aed";

export class InvoiceService {
  private readonly TAX_RATE = VAT_RATE;

  async generate(bookingId: string, userId: string): Promise<Invoice> {
    const existing = await prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) return existing;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { wheelchair: true, payment: true },
    });
    if (!booking) throw new Error("Booking not found");

    const invoiceNumber = await this.getNextInvoiceNumber();
    const subtotal = roundCurrency(Number(booking.totalPrice));
    const expectedTaxAmount = calculateTax(subtotal, this.TAX_RATE);
    const expectedTotalAmount = calculateTotal(subtotal, this.TAX_RATE);
    const chargedTotal =
      booking.paymentStatus === "PAID" && booking.payment?.amount
        ? roundCurrency(Number(booking.payment.amount))
        : expectedTotalAmount;
    const taxAmount = roundCurrency(
      Math.max(chargedTotal - subtotal, expectedTaxAmount),
    );
    const totalAmount = chargedTotal;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
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

    return invoice;
  }

  async getByBooking(
    bookingId: string,
    userId: string,
  ): Promise<Invoice | null> {
    return prisma.invoice.findFirst({
      where: { bookingId, userId },
    });
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

    const paddedCount = String(counter.count).padStart(4, "0");
    return `INV-${year}-${paddedCount}`;
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