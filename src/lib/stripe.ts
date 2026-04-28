import Stripe from "stripe";
import { getRequiredEnv } from "./env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
      typescript: true,
    });
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}
