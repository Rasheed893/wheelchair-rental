import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { MissingEnvError } from "@/lib/env";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { paymentService } from "@/services/payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing Stripe signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    if (error instanceof MissingEnvError) {
      console.error("[PAYMENT ERROR]", {
        bookingId: null,
        error: error.message,
      });
      return NextResponse.json(
        { success: false, error: "Stripe webhook is not configured" },
        { status: 500 },
      );
    }

    console.error("[PAYMENT ERROR]", {
      bookingId: null,
      error,
    });
    return NextResponse.json(
      { success: false, error: "Invalid Stripe signature" },
      { status: 400 },
    );
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata?.bookingId;

      if (!bookingId) {
        console.error("[PAYMENT ERROR]", {
          bookingId: null,
          error: "payment_intent.succeeded missing bookingId metadata",
        });
        return NextResponse.json(
          { success: false, error: "Missing bookingId metadata" },
          { status: 400 },
        );
      }

      await paymentService.onPaymentSucceeded(intent);
      return NextResponse.json({ success: true, received: true });
    }

    if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "charge.refunded"
    ) {
      await paymentService.handleWebhook(event);
      return NextResponse.json({ success: true, received: true });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("[PAYMENT ERROR]", {
      bookingId:
        event.type === "payment_intent.succeeded"
          ? (event.data.object as Stripe.PaymentIntent).metadata?.bookingId ?? null
          : null,
      error,
    });
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
