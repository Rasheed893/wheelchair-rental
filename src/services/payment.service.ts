// src/services/payment.service.ts
// import { sendBookingConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { PaymentIntentResponse } from "@/types";
import { invoiceService } from "./invoice.service";
import { sendBookingConfirmationEmail } from "@/lib/emails/send-booking-confirmation-email";

const CURRENCY = "aed";

function toJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value));
}

export class PaymentService {
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

    if (
      booking.payment?.stripePaymentIntentId &&
      booking.payment.status === "PENDING"
    ) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        booking.payment.stripePaymentIntentId,
      );

      return {
        clientSecret: existingIntent.client_secret!,
        paymentIntentId: existingIntent.id,
        amount: existingIntent.amount,
        currency: existingIntent.currency,
      };
    }

    const amountInMinorUnit = Math.round(Number(booking.totalPrice) * 100);

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
      },
      description: `Wheelchair rental: ${booking.wheelchair.name} (${booking.totalDays} days)`,
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
        amount: booking.totalPrice,
        currency: CURRENCY,
        status: "PENDING",
        metadata: toJson(intent.metadata),
      },
      create: {
        bookingId: booking.id,
        stripePaymentIntentId: intent.id,
        amount: booking.totalPrice,
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
    switch (event.type) {
      case "payment_intent.succeeded": {
        console.log("[WEBHOOK] payment_intent.succeeded received");
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
      console.error("[PAYMENT] ❌ Missing bookingId in metadata");
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
      found: !!booking,
      status: booking?.status,
      email: booking?.user?.email,
    });

    if (!booking) {
      console.error(`[Webhook] Booking not found for intent: ${intent.id}`);
      return;
    }
    console.log("[PAYMENT] Current booking status:", booking.status);
    console.log("[PAYMENT] Current payment status:", booking.payment?.status);

    if (
      booking.status === "CONFIRMED" &&
      booking.payment?.status === "SUCCEEDED"
    ) {
      console.log("[PAYMENT] ⚠️ Already confirmed, skipping");
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { bookingId },
        update: {
          stripePaymentIntentId: intent.id,
          amount: Number(intent.amount) / 100,
          currency: intent.currency,
          status: "SUCCEEDED",
          paidAt: new Date(),
          metadata: toJson(intent),
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

      if (booking.status !== "CONFIRMED") {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
        });
        console.log("[PAYMENT] Booking marked CONFIRMED");
      }
    });
    console.log("[PAYMENT] Transaction completed");

    await invoiceService.generate(bookingId, booking.user.id);
    console.log("[PAYMENT] Invoice generated");

    console.log("[PAYMENT] ABOUT TO SEND EMAIL");

    try {
      console.log("[EMAIL] Sending booking confirmation...");
      await sendBookingConfirmationEmail({
        to: booking.user.email,
        customerName: booking.user.name,
        wheelchairName: booking.wheelchair.name,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: Number(booking.totalPrice),
        bookingId,
      });
      console.log("[PAYMENT] EMAIL SENT SUCCESSFULLY");
    } catch (error) {
      console.error("[Email] Failed to send booking confirmation:", error);
    }
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
}

export const paymentService = new PaymentService();
