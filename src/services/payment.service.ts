import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import type { PaymentIntentResponse } from "@/types";
import { invoiceService } from "./invoice.service";
import { logger } from "@/lib/logger";
import {
  sendAdminPaymentConfirmationEmail,
  sendCustomerPaymentConfirmationEmail,
} from "@/lib/emails/send-booking-confirmation-email";
import { VAT_RATE, calculateBookingPricing } from "@/lib/pricing";
import { getLegacyReservationCutoff } from "@/lib/booking-reservation";

const CURRENCY = "aed";

type EmailMetadata = {
  bookingConfirmationCustomerSentAt?: string;
  bookingConfirmationAdminSentAt?: string;
  invoiceGeneratedAt?: string;
  paymentConfirmationSentAt?: string;
  paymentConfirmationCustomerSentAt?: string;
  paymentConfirmationAdminSentAt?: string;
  [key: string]: unknown;
};

type InvoiceNotificationData = {
  invoiceNumber?: string;
  invoiceUrl?: string | null;
  totalAmount: number;
};

type BookingPricingSnapshot = {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
};

function toJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value));
}

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

export class PaymentService {
  private getBookingPricingSnapshot(booking: {
    totalDays: number;
    wheelchair: { pricePerDay: Prisma.Decimal | number };
  }): BookingPricingSnapshot {
    const totalDays = Number(booking.totalDays);
    const pricePerDay = Number(booking.wheelchair.pricePerDay);

    if (!Number.isFinite(totalDays) || totalDays <= 0) {
      throw new Error("Booking is invalid");
    }

    if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
      throw new Error("Booking pricing is invalid");
    }

    return calculateBookingPricing(totalDays, pricePerDay, VAT_RATE);
  }

  private async getRetriableBooking(bookingId: string, userId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: { wheelchair: true, payment: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentMethod !== "ONLINE") {
      throw new Error("Retry payment is only available for ONLINE bookings");
    }

    if (booking.paymentStatus !== "PENDING" || booking.status !== "PENDING") {
      throw new Error("Booking is no longer awaiting payment");
    }

    const now = new Date();
    const isExpired =
      (booking.reservationExpiresAt && booking.reservationExpiresAt <= now) ||
      (!booking.reservationExpiresAt &&
        booking.createdAt <= getLegacyReservationCutoff(now));

    if (isExpired) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: "EXPIRED",
          status: "CANCELLED",
          cancelledAt: now,
          cancelReason: "Reservation expired before payment completion",
        },
      });
      throw new Error("Booking expired");
    }

    this.getBookingPricingSnapshot(booking);

    return booking;
  }

  async confirmPaymentIntentForUser(
    paymentIntentId: string,
    userId: string,
    expectedBookingId?: string,
  ): Promise<{
    processed: boolean;
    reason?: string;
    bookingId?: string;
    paymentStatus?: "PENDING" | "PAID" | "EXPIRED";
  }> {
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const bookingId = intent.metadata?.bookingId;
    if (!bookingId) {
      return { processed: false, reason: "Missing bookingId metadata" };
    }

    if (expectedBookingId && expectedBookingId !== bookingId) {
      return { processed: false, reason: "Booking ID mismatch", bookingId };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true },
    });

    if (!booking) {
      return { processed: false, reason: "Booking not found", bookingId };
    }

    if (booking.userId !== userId) {
      return { processed: false, reason: "Forbidden", bookingId };
    }

    if (intent.status !== "succeeded") {
      return {
        processed: false,
        reason: `PaymentIntent status is ${intent.status}`,
        bookingId,
      };
    }

    await this.onPaymentSucceeded(intent);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true },
    });

    return {
      processed: updatedBooking?.paymentStatus === "PAID",
      bookingId,
      paymentStatus: updatedBooking?.paymentStatus,
      reason:
        updatedBooking?.paymentStatus === "PAID"
          ? undefined
          : "Payment has not been marked as PAID yet",
    };
  }

  async createIntent(
    bookingId: string,
    userId: string,
    forceNew = false,
  ): Promise<PaymentIntentResponse> {
    const stripe = getStripeClient();
    const booking = await this.getRetriableBooking(bookingId, userId);

    const { subtotal, taxAmount, totalAmount } =
      this.getBookingPricingSnapshot(booking);
    const amountInMinorUnit = Math.round(totalAmount * 100);

    if (
      !forceNew &&
      booking.payment?.stripePaymentIntentId &&
      booking.payment.status === "PENDING"
    ) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        booking.payment.stripePaymentIntentId,
      );
      if (existingIntent.amount === amountInMinorUnit) {
        return {
          clientSecret: existingIntent.client_secret!,
          paymentIntentId: existingIntent.id,
          amount: existingIntent.amount,
          currency: existingIntent.currency,
        };
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountInMinorUnit,
      currency: CURRENCY,
      metadata: {
        bookingId: booking.id,
        userId,
        wheelchairId: booking.wheelchairId,
        taxRate: String(VAT_RATE),
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      },
      description: `Wheelchair rental: ${booking.wheelchair.name} (${booking.totalDays} days, incl. VAT)`,
    });

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        stripePaymentIntentId: intent.id,
        amount: totalAmount,
        currency: CURRENCY,
        status: "PENDING",
        metadata: toJson(intent.metadata),
      },
      create: {
        bookingId: booking.id,
        stripePaymentIntentId: intent.id,
        amount: totalAmount,
        currency: CURRENCY,
        status: "PENDING",
        metadata: toJson(intent.metadata),
      },
    });

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
      amount: amountInMinorUnit,
      currency: CURRENCY,
    };
  }

  async retryPayment(
    bookingId: string,
    userId: string,
  ): Promise<
    PaymentIntentResponse & {
      bookingId: string;
      paymentUrl: string;
    }
  > {
    const booking = await this.getRetriableBooking(bookingId, userId);
    const intent = await this.createIntent(booking.id, userId, true);

    return {
      ...intent,
      bookingId: booking.id,
      paymentUrl: `/wheelchairs/${booking.wheelchairId}/book?bookingId=${booking.id}`,
    };
  }

  async handleWebhook(event: import("stripe").Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const object = event.data.object as { object?: string };
        if (object?.object !== "payment_intent") {
          return;
        }

        const intent = event.data
          .object as import("stripe").Stripe.PaymentIntent;
        await this.onPaymentSucceeded(intent);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data
          .object as import("stripe").Stripe.PaymentIntent;
        await this.onPaymentFailed(intent);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as import("stripe").Stripe.Charge;
        await this.onRefunded(charge);
        break;
      }
      default:
        break;
    }
  }

  async onPaymentSucceeded(intent: import("stripe").Stripe.PaymentIntent) {
    const bookingId = intent.metadata.bookingId;
    if (!bookingId) {
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        wheelchair: { select: { name: true, pricePerDay: true } },
        payment: true,
      },
    });

    if (!booking) {
      logger.error("[PAYMENT ERROR]", {
        bookingId,
        error: "Booking not found for succeeded payment intent",
      });
      return;
    }

    if (booking.paymentStatus !== "PAID") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: { bookingId },
          update: {
            stripePaymentIntentId: intent.id,
            amount: Number(intent.amount) / 100,
            currency: intent.currency,
            status: "SUCCEEDED",
            paidAt: new Date(),
            metadata: toInputJson({
              ...this.getPaymentMetadata(booking.payment?.metadata),
              ...toJson(intent),
            }),
          },
          create: {
            bookingId,
            stripePaymentIntentId: intent.id,
            amount: Number(intent.amount) / 100,
            currency: intent.currency,
            status: "SUCCEEDED",
            paidAt: new Date(),
            metadata: toJson(intent),
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            paymentMethod: "ONLINE",
            paymentStatus: "PAID",
            reservationExpiresAt: null,
            paidAt: new Date(),
          },
        });
      });
    }

    const invoice = await this.prepareInvoiceNotificationData(
      bookingId,
      booking.user.id,
      booking.payment?.amount
        ? Number(booking.payment.amount)
        : this.getBookingPricingSnapshot(booking).totalAmount,
    );

    try {
      await this.sendPaymentConfirmationEmails({
        bookingId: booking.id,
        customerEmail: booking.user.email,
        customerName: booking.user.name,
        phoneNumber: booking.phoneNumber,
        deliveryAddress: booking.deliveryAddress,
        deliveryNotes: booking.deliveryNotes ?? undefined,
        wheelchairName: booking.wheelchair.name,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: invoice.totalAmount,
        paymentMethod: "ONLINE",
        paymentStatus: "PAID",
        invoiceNumber: invoice.invoiceNumber,
        invoiceUrl: invoice.invoiceUrl,
      });
    } catch (error) {
      logger.error("[EMAIL ERROR]", {
        bookingId,
        error,
      });
    }
  }

  private async onPaymentFailed(intent: import("stripe").Stripe.PaymentIntent) {
    const bookingId = intent.metadata.bookingId;
    if (!bookingId) {
      return;
    }

    logger.error("[PAYMENT ERROR]", {
      bookingId,
      error:
        intent.last_payment_error?.message ??
        `PaymentIntent failed with status ${intent.status}`,
    });

    await prisma.payment.upsert({
      where: { bookingId },
      update: {
        stripePaymentIntentId: intent.id,
        amount: Number(intent.amount) / 100,
        currency: intent.currency,
        status: "FAILED",
        metadata: toJson(intent),
      },
      create: {
        bookingId,
        stripePaymentIntentId: intent.id,
        amount: Number(intent.amount) / 100,
        currency: intent.currency,
        status: "FAILED",
        metadata: toJson(intent),
      },
    });
  }

  private async onRefunded(charge: import("stripe").Stripe.Charge) {
    if (!charge.payment_intent) return;

    const payment = await prisma.payment.findUnique({
      where: {
        stripePaymentIntentId: charge.payment_intent as string,
      },
    });
    if (!payment) return;

    const refundAmount = charge.amount_refunded / 100;
    const refundId = charge.refunds?.data?.[0]?.id;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundAmount,
        stripeRefundId: refundId,
      },
    });
  }

  async markCashBookingPaid(bookingId: string) {
    const result = await this.finalizeCashBookingPayment(bookingId);
    return result;
  }

  async markCashBookingPaidForAdmin(bookingId: string) {
    const result = await this.finalizeCashBookingPayment(bookingId);
    return result;
  }

  private async finalizeCashBookingPayment(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        payment: true,
        wheelchair: { select: { name: true, pricePerDay: true } },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentMethod !== "CASH") {
      throw new Error("Only CASH bookings can be marked as paid");
    }

    if (!isValidEmail(booking.user?.email)) {
      throw new Error("Booking user email is missing or invalid");
    }

    const paymentMetadata = this.getPaymentMetadata(booking.payment?.metadata);
    const wasPending = booking.paymentStatus === "PENDING";

    if (wasPending) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: booking.status === "PENDING" ? "CONFIRMED" : booking.status,
            paymentStatus: "PAID",
            paidAt: new Date(),
          },
        });

        await tx.payment.upsert({
          where: { bookingId },
          update: {
            stripePaymentIntentId:
              booking.payment?.stripePaymentIntentId ?? `cash_${bookingId}`,
            amount: booking.totalPrice,
            currency: booking.payment?.currency ?? CURRENCY,
            status: "SUCCEEDED",
            paidAt: new Date(),
            metadata: toInputJson({
              ...paymentMetadata,
              source: "cash",
              bookingId,
            }),
          },
          create: {
            bookingId,
            stripePaymentIntentId: `cash_${bookingId}`,
            amount: booking.totalPrice,
            currency: CURRENCY,
            status: "SUCCEEDED",
            paidAt: new Date(),
            metadata: toInputJson({
              source: "cash",
              bookingId,
            }),
          },
        });
      });
    }

    const invoice = await this.prepareInvoiceNotificationData(
      bookingId,
      booking.user.id,
      booking.payment?.amount
        ? Number(booking.payment.amount)
        : this.getBookingPricingSnapshot(booking).totalAmount,
    );

    try {
      await this.sendPaymentConfirmationEmails({
        bookingId,
        customerEmail: booking.user.email,
        customerName: booking.user.name,
        phoneNumber: booking.phoneNumber,
        deliveryAddress: booking.deliveryAddress,
        deliveryNotes: booking.deliveryNotes ?? undefined,
        wheelchairName: booking.wheelchair.name,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: invoice.totalAmount,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        invoiceNumber: invoice.invoiceNumber,
        invoiceUrl: invoice.invoiceUrl,
      });
    } catch (error) {
      logger.error("[EMAIL ERROR]", {
        bookingId,
        error,
      });
    }

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    return {
      updated: wasPending,
      booking: updatedBooking ?? booking,
    };
  }

  private getPaymentMetadata(metadata: unknown): EmailMetadata {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
      return {};
    }

    return metadata as EmailMetadata;
  }

  private async prepareInvoiceNotificationData(
    bookingId: string,
    userId: string,
    fallbackTotalAmount: number,
  ): Promise<InvoiceNotificationData> {
    const existingInvoice = await invoiceService.getByBooking(
      bookingId,
      userId,
    );
    if (existingInvoice) {
      return {
        invoiceNumber: existingInvoice.invoiceNumber,
        invoiceUrl: existingInvoice.pdfUrl ?? null,
        totalAmount: Number(existingInvoice.totalAmount),
      };
    }

    try {
      const invoice = await invoiceService.generate(bookingId, userId);
      const invoiceDetails = await invoiceService.getByBooking(
        bookingId,
        userId,
      );

      return {
        invoiceNumber: invoice.invoiceNumber,
        invoiceUrl: invoiceDetails?.pdfUrl ?? null,
        totalAmount: Number(invoice.totalAmount),
      };
    } catch (error) {
      logger.error("[INVOICE ERROR]", {
        bookingId,
        error,
      });

      const fallbackInvoice = await invoiceService.getByBooking(
        bookingId,
        userId,
      );
      if (!fallbackInvoice) {
        return {
          totalAmount: fallbackTotalAmount,
        };
      }

      return {
        invoiceNumber: fallbackInvoice.invoiceNumber,
        invoiceUrl: fallbackInvoice.pdfUrl ?? null,
        totalAmount: Number(fallbackInvoice.totalAmount),
      };
    }
  }

  private async markPaymentEmailMetadata(
    bookingId: string,
    updates: Partial<EmailMetadata>,
  ) {
    const currentPayment = await prisma.payment.findUnique({
      where: { bookingId },
      select: { metadata: true },
    });

    if (!currentPayment) {
      return;
    }

    const metadata = this.getPaymentMetadata(currentPayment.metadata);
    await prisma.payment.update({
      where: { bookingId },
      data: {
        metadata: toInputJson({
          ...metadata,
          ...updates,
        }),
      },
    });
  }

  private async sendPaymentConfirmationEmails({
    bookingId,
    customerEmail,
    customerName,
    phoneNumber,
    deliveryAddress,
    wheelchairName,
    startDate,
    endDate,
    totalAmount,
    paymentMethod,
    paymentStatus,
    invoiceNumber,
    invoiceUrl,
  }: {
    bookingId: string;
    customerEmail: string;
    customerName: string;
    phoneNumber: string;
    deliveryAddress: string;
    deliveryNotes?: string;
    wheelchairName: string;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
    paymentMethod: "ONLINE" | "CASH";
    paymentStatus: "PENDING" | "PAID";
    invoiceNumber?: string;
    invoiceUrl?: string | null;
  }) {
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      select: { metadata: true },
    });
    const metadata = this.getPaymentMetadata(payment?.metadata);

    if (paymentStatus !== "PAID") {
      return;
    }

    if (!metadata.paymentConfirmationCustomerSentAt) {
      const sentAt = new Date().toISOString();
      await sendCustomerPaymentConfirmationEmail({
        to: customerEmail,
        customerName,
        phoneNumber,
        deliveryAddress,
        wheelchairName,
        startDate,
        endDate,
        bookingId,
        paymentMethod,
        totalAmount,
        invoiceNumber,
        invoiceUrl,
      });
      await this.markPaymentEmailMetadata(bookingId, {
        paymentConfirmationSentAt: sentAt,
        paymentConfirmationCustomerSentAt: sentAt,
      });
    }

    if (!metadata.paymentConfirmationAdminSentAt) {
      await sendAdminPaymentConfirmationEmail({
        to: customerEmail,
        customerName,
        customerEmail,
        phoneNumber,
        deliveryAddress,
        wheelchairName,
        startDate,
        endDate,
        bookingId,
        paymentMethod,
        totalAmount,
        invoiceNumber,
        invoiceUrl,
      });
      await this.markPaymentEmailMetadata(bookingId, {
        paymentConfirmationAdminSentAt: new Date().toISOString(),
      });
    }
  }
}

export const paymentService = new PaymentService();
