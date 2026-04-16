// src/components/booking/StripePaymentForm.tsx
"use client";

import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

interface Props {
  bookingId: string;
  locale: string;
  returnUrl?: string;
}

export function StripePaymentForm({ bookingId, locale, returnUrl }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultReturn = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/${locale}/payment/success?bookingId=${bookingId}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl ?? defaultReturn,
      },
    });

    if (stripeError) {
      setError(
        stripeError.type === "card_error" ||
          stripeError.type === "validation_error"
          ? (stripeError.message ?? isAr)
            ? "خطأ في الدفع"
            : "Payment error"
          : isAr
            ? "حدث خطأ غير متوقع. يرجى المحاولة مجدداً."
            : "An unexpected error occurred. Please try again.",
      );
      setLoading(false);
    }
    // On success, Stripe redirects automatically — no need to handle here
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
          <span className="text-red-500 mt-0.5">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="btn-primary w-full justify-center py-3.5 text-base"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {isAr ? "جاري معالجة الدفع..." : "Processing payment..."}
          </span>
        ) : (
          <>💳 {isAr ? "ادفع الآن" : "Pay Now"}</>
        )}
      </button>

      <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
        <span>🔒</span>
        {isAr
          ? "دفعتك محمية بتشفير SSL عبر Stripe"
          : "Your payment is secured with SSL encryption via Stripe"}
      </p>
    </form>
  );
}
