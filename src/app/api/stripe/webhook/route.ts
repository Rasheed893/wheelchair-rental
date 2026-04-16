import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { paymentService } from "@/services/payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[STRIPE WEBHOOK] HIT");
  console.log("[STRIPE WEBHOOK] HEADERS:", req.headers);
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  console.log("[STRIPE WEBHOOK] Raw body received");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing Stripe signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
    console.log("[STRIPE WEBHOOK] Signature verified");
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed:", error);
    return NextResponse.json(
      { success: false, error: "Invalid Stripe signature" },
      { status: 400 },
    );
  }

  try {
    console.log("[STRIPE WEBHOOK] Event type:", event.type);
    console.log(
      "[STRIPE WEBHOOK] Event data:",
      JSON.stringify(event.data, null, 2),
    );
    console.log("[STRIPE WEBHOOK] Forwarding to PaymentService");

    await paymentService.handleWebhook(event);

    console.log("[STRIPE WEBHOOK] SUCCESS END");

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Handler error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
