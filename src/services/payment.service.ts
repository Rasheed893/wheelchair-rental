import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { PaymentIntentResponse } from "@/types";
import { invoiceService } from "./invoice.service";
import {
  sendBookingConfirmationEmail,
  sendCashPaymentReceivedEmail,
} from "@/lib/emails/send-booking-confirmation-email";
import { VAT_RATE, calculateTax, calculateTotal } from "@/lib/pricing";

const CURRENCY = "aed";

type EmailMetadata = {
  bookingConfirmationCustomerSentAt?: string;
  paymentConfirmationSentAt?: string;
  [key: string]: unknown;
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
  async confirmPaymentIntentForUser(
    paymentIntentId: string,
    userId: string,
    expectedBookingId?: string,
  ): Promise<{ processed: boolean; reason?: string; bookingId?: string }> {
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
    return { processed: true, bookingId };
  }

  async createIntent(
    bookingId: string,
    userId: string,
  ): Promise<PaymentIntentResponse> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: { wheelchair: true, payment: true },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "PENDING") {
      throw new Error("Booking is not in a pending state");
    }
    if (booking.paymentMethod !== "ONLINE") {
      throw new Error("Stripe payment is only available for ONLINE bookings");
    }

    const subtotal = Number(booking.totalPrice);
    const taxAmount = calculateTax(subtotal);
    const totalAmount = calculateTotal(subtotal);
    const amountInMinorUnit = Math.round(totalAmount * 100);

    if (
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

    console.log("[CREATE INTENT] Booking from DB:", {
      id: booking.id,
      status: booking.status,
      totalPrice: booking.totalPrice,
    });

    console.log("[CREATE INTENT] Metadata to Stripe:", {
      bookingId: booking.id,
      userId,
      wheelchairId: booking.wheelchairId,
    });

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
    console.log("[CREATE INTENT] Stripe intent created:", {
      id: intent.id,
      metadata: intent.metadata,
    });

    const verifyIntent = await stripe.paymentIntents.retrieve(intent.id);
    console.log("[VERIFY INTENT] Metadata from Stripe:", verifyIntent.metadata);

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

  async handleWebhook(event: import("stripe").Stripe.Event): Promise<void> {
    console.log("[WEBHOOK] Enter handleWebhook", {
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      apiVersion: event.api_version,
      created: event.created,
    });

    switch (event.type) {
      case "payment_intent.succeeded": {
        console.log("[WEBHOOK] payment_intent.succeeded received");
        const object = event.data.object as { object?: string };
        if (object?.object !== "payment_intent") {
          console.error("[WEBHOOK] Unexpected succeeded payload object", {
            eventId: event.id,
            eventType: event.type,
            objectType: object?.object,
          });
          return;
        }

        const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
        console.log("[WEBHOOK] Routing succeeded intent", {
          id: intent.id,
          status: intent.status,
          metadata: intent.metadata,
        });
        await this.onPaymentSucceeded(intent);
        console.log("[WEBHOOK] onPaymentSucceeded completed", {
          paymentIntentId: intent.id,
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as import("stripe").Stripe.PaymentIntent;
        console.log("[WEBHOOK] Routing failed intent", {
          id: intent.id,
          status: intent.status,
        });
        await this.onPaymentFailed(intent);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as import("stripe").Stripe.Charge;
        console.log("[WEBHOOK] Routing refunded charge", {
          id: charge.id,
          paymentIntent: charge.payment_intent,
          amountRefunded: charge.amount_refunded,
        });
        await this.onRefunded(charge);
        break;
      }
      default:
        console.warn("[WEBHOOK] Unhandled event type", {
          id: event.id,
          type: event.type,
          object: (event.data.object as { object?: string } | null)?.object,
        });
        break;
    }
  }

  private async onPaymentSucceeded(
    intent: import("stripe").Stripe.PaymentIntent,
  ) {
    console.log("[WEBHOOK] FULL INTENT OBJECT:");
    console.log(JSON.stringify(intent, null, 2));
    console.log("[PAYMENT] onPaymentSucceeded ENTERED");
    console.log("[PAYMENT] Intent ID:", intent.id);
    console.log("[PAYMENT] Metadata:", intent.metadata);
    const bookingId = intent.metadata.bookingId;

    console.log("[PAYMENT] Extracted bookingId:", bookingId);

    if (!bookingId) {
      console.error(
        `[Webhook] Missing bookingId metadata for intent: ${intent.id}`,
      );
      console.error("[PAYMENT] Missing bookingId in metadata");
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        wheelchair: { select: { name: true } },
        payment: true,
      },
    });
    console.log("[PAYMENT] Booking fetch result:", {
      found: Boolean(booking),
      status: booking?.status,
      email: booking?.user?.email,
      bookingPaymentStatus: booking?.paymentStatus,
      paymentRowStatus: booking?.payment?.status,
    });

    if (!booking) {
      console.error(`[Webhook] Booking not found for intent: ${intent.id}`);
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
        console.log("[PAYMENT] Payment updated");

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            paymentMethod: "ONLINE",
            paymentStatus: "PAID",
            paidAt: new Date(),
          },
        });
      });

      console.log("[PAYMENT] Booking marked paid by Stripe");
      await invoiceService.generate(bookingId, booking.user.id);
      console.log("[PAYMENT] Invoice generated");
    } else {
      console.log("[PAYMENT] Booking already marked paid, verifying email idempotency state");
    }

    await this.sendBookingEmailsForPaidBooking({
      bookingId,
      customerEmail: booking.user.email,
      customerName: booking.user.name,
      phoneNumber: booking.phoneNumber,
      deliveryAddress: booking.deliveryAddress,
      deliveryNotes: booking.deliveryNotes ?? undefined,
      wheelchairName: booking.wheelchair.name,
      startDate: booking.startDate,
      endDate: booking.endDate,
      subtotal: Number(booking.totalPrice),
      paymentMethod: "ONLINE",
    });
  }

  private async onPaymentFailed(intent: import("stripe").Stripe.PaymentIntent) {
    const bookingId = intent.metadata.bookingId;

    if (!bookingId) {
      return;
    }

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
    console.log("[MARK PAID] service entered", { bookingId });
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        payment: true,
      },
    });
    console.log("[MARK PAID] booking lookup result", {
      found: Boolean(booking),
      bookingId,
      paymentMethod: booking?.paymentMethod,
      paymentStatus: booking?.paymentStatus,
      userId: booking?.user?.id,
      userEmail: booking?.user?.email,
      paymentMetadata: booking?.payment?.metadata,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }
    if (booking.paymentMethod !== "CASH") {
      throw new Error("Only CASH bookings can be marked as paid");
    }

    if (!isValidEmail(booking.user?.email)) {
      console.error("[MARK PAID] invalid or missing customer email", {
        bookingId,
        userEmail: booking.user?.email,
      });
      throw new Error("Booking user email is missing or invalid");
    }

    const paymentMetadata = this.getPaymentMetadata(booking.payment?.metadata);
    const wasPending = booking.paymentStatus === "PENDING";
    console.log("[MARK PAID] status check", {
      bookingId,
      previousPaymentStatus: booking.paymentStatus,
      shouldTransitionToPaid: wasPending,
      paymentConfirmationSentAt: paymentMetadata.paymentConfirmationSentAt,
    });

    if (wasPending) {
      console.log("[MARK PAID] updating payment status", {
        bookingId,
        from: booking.paymentStatus,
        to: "PAID",
      });
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
          },
        });

        await tx.payment.upsert({
          where: { bookingId },
          update: {
            stripePaymentIntentId: booking.payment?.stripePaymentIntentId ?? `cash_${bookingId}`,
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

      console.log("[PAYMENT] Cash booking marked paid", {
        bookingId,
        previousPaymentStatus: booking.paymentStatus,
        currentPaymentStatus: "PAID",
      });
    } else {
      console.log("[MARK PAID] booking already PAID, checking idempotency guards", {
        bookingId,
      });
    }

    try {
      console.log("[MARK PAID] calling email भेज", {
        bookingId,
        to: booking.user.email,
        customerName: booking.user.name,
      });
      await this.sendCashPaymentConfirmation({
        bookingId,
        customerEmail: booking.user.email,
        customerName: booking.user.name,
      });
      console.log("[MARK PAID] email flow completed", { bookingId });
    } catch (error) {
      console.error("[EMAIL ERROR]", {
        bookingId,
        to: booking.user.email,
        error,
      });
      throw error;
    }

    const updated = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    return { updated: booking.paymentStatus !== "PAID", booking: updated ?? booking };
  }

  async markCashBookingPaidForAdmin(bookingId: string) {
    console.log("[MARK PAID] service entered", { bookingId });
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        payment: true,
      },
    });
    console.log("[MARK PAID] booking lookup result", {
      found: Boolean(booking),
      bookingId,
      paymentMethod: booking?.paymentMethod,
      paymentStatus: booking?.paymentStatus,
      userId: booking?.user?.id,
      userEmail: booking?.user?.email,
      paymentMetadata: booking?.payment?.metadata,
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentMethod !== "CASH") {
      throw new Error("Only CASH bookings can be marked as paid");
    }

    if (!isValidEmail(booking.user?.email)) {
      console.error("[MARK PAID] invalid or missing customer email", {
        bookingId,
        userEmail: booking.user?.email,
      });
      throw new Error("Booking user email is missing or invalid");
    }

    const paymentMetadata = this.getPaymentMetadata(booking.payment?.metadata);
    const wasPending = booking.paymentStatus === "PENDING";
    console.log("[MARK PAID] status check", {
      bookingId,
      previousPaymentStatus: booking.paymentStatus,
      shouldTransitionToPaid: wasPending,
      paymentConfirmationSentAt: paymentMetadata.paymentConfirmationSentAt,
    });

    if (!wasPending) {
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      console.log("[MARK PAID] skipping email because payment status is already PAID", {
        bookingId,
      });

      return {
        updated: false,
        booking: updatedBooking ?? booking,
      };
    }

    console.log("[MARK PAID] updating payment status", {
      bookingId,
      from: booking.paymentStatus,
      to: "PAID",
    });

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
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

    console.log("[PAYMENT] Cash booking marked paid", {
      bookingId,
      previousPaymentStatus: booking.paymentStatus,
      currentPaymentStatus: "PAID",
    });

    console.log("[MARK PAID] calling email भेज", {
      bookingId,
      to: booking.user.email,
      customerName: booking.user.name,
    });
    await this.sendCashPaymentConfirmation({
      bookingId,
      customerEmail: booking.user.email,
      customerName: booking.user.name,
    });
    console.log("[MARK PAID] email flow completed", { bookingId });

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    return {
      updated: true,
      booking: updatedBooking ?? booking,
    };
  }

  private getPaymentMetadata(metadata: unknown): EmailMetadata {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
      return {};
    }

    return metadata as EmailMetadata;
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
      console.warn("[EMAIL] Cannot persist email metadata because payment row was not found", {
        bookingId,
        updates,
      });
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

  private async sendBookingEmailsForPaidBooking({
    bookingId,
    customerEmail,
    customerName,
    phoneNumber,
    deliveryAddress,
    deliveryNotes,
    wheelchairName,
    startDate,
    endDate,
    subtotal,
    paymentMethod,
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
    subtotal: number;
    paymentMethod: "ONLINE" | "CASH";
  }) {
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      select: { metadata: true },
    });
    const metadata = this.getPaymentMetadata(payment?.metadata);

    if (!metadata.bookingConfirmationCustomerSentAt) {
      await sendBookingConfirmationEmail({
        to: customerEmail,
        customerName,
        phoneNumber,
        deliveryAddress,
        deliveryNotes,
        wheelchairName,
        startDate,
        endDate,
        subtotal,
        bookingId,
        paymentMethod,
        paymentStatus: "PAID",
      });
      await this.markPaymentEmailMetadata(bookingId, {
        bookingConfirmationCustomerSentAt: new Date().toISOString(),
      });
    } else {
      console.log("[EMAIL] Customer paid booking confirmation already sent, skipping duplicate", {
        bookingId,
        sentAt: metadata.bookingConfirmationCustomerSentAt,
      });
    }

  }

  private async sendCashPaymentConfirmation({
    bookingId,
    customerEmail,
    customerName,
  }: {
    bookingId: string;
    customerEmail: string;
    customerName: string;
  }) {
    console.log("[MARK PAID] sendCashPaymentConfirmation entered", {
      bookingId,
      customerEmail,
    });
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      select: { metadata: true },
    });
    const metadata = this.getPaymentMetadata(payment?.metadata);
    console.log("[MARK PAID] email idempotency check", {
      bookingId,
      paymentConfirmationSentAt: metadata.paymentConfirmationSentAt,
    });

    if (metadata.paymentConfirmationSentAt) {
      console.log("[MARK PAID] skipping email because payment confirmation already sent", {
        bookingId,
        sentAt: metadata.paymentConfirmationSentAt,
      });
      return;
    }

    try {
      await sendCashPaymentReceivedEmail({
        to: customerEmail,
        customerName,
        bookingId,
      });

      await this.markPaymentEmailMetadata(bookingId, {
        paymentConfirmationSentAt: new Date().toISOString(),
      });
      console.log("[MARK PAID] payment confirmation email recorded in metadata", {
        bookingId,
      });
    } catch (error) {
      console.error("[EMAIL ERROR]", {
        bookingId,
        to: customerEmail,
        error,
      });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
