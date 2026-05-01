"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInDays, format } from "date-fns";
import { DateRange, DayPicker } from "react-day-picker";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import "react-day-picker/dist/style.css";
import { formatAED } from "@/lib/currency";
import { VAT_RATE, calculateTax, calculateTotal } from "@/lib/pricing";
import { logger } from "@sentry/nextjs";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface WheelchairInfo {
  id: string;
  name: string;
  nameAr: string;
  pricePerDay: number;
  images: string[];
}

function PaymentForm({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: submitElementsError } = await elements.submit();
    if (submitElementsError) {
      setError(submitElementsError.message ?? "Payment failed");
      setLoading(false);
      return;
    }
    const { error: submitError } = await stripe.confirmPayment({
      elements,
      // clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/payment/success?bookingId=${bookingId}`,
      },
    });

    if (submitError) {
      setError(submitError.message ?? "Payment failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

export default function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { locale, id } = React.use(params);
  const { bookingId } = React.use(searchParams);
  const router = useRouter();

  const [wheelchair, setWheelchair] = useState<WheelchairInfo | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [step, setStep] = useState<"dates" | "payment">(
    bookingId ? "payment" : "dates",
  );
  const [bookingIdState, setBookingId] = useState<string | null>(
    bookingId ?? null,
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return 0;
    }

    return Math.max(1, differenceInDays(dateRange.to, dateRange.from));
  }, [dateRange]);

  const subtotal = wheelchair ? days * Number(wheelchair.pricePerDay) : 0;
  const taxAmount = calculateTax(subtotal, VAT_RATE);
  const totalPrice = calculateTotal(subtotal, VAT_RATE);

  const initializePayment = useCallback(
    async (targetBookingId: string, mode: "initial" | "retry" = "initial") => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          mode === "retry"
            ? "/api/payments/retry"
            : "/api/payments/create-intent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: targetBookingId }),
          },
        );
        const data = await response.json();

        if (!data.success || !data.data?.clientSecret) {
          throw new Error(data.error ?? "Unable to initialize payment.");
        }

        setBookingId(targetBookingId);
        setClientSecret(data.data.clientSecret);
        setStep("payment");
        router.replace(
          `/${locale}/wheelchairs/${id}/book?bookingId=${targetBookingId}`,
        );
      } catch (paymentError) {
        setClientSecret(null);
        setStep("payment");
        setError(
          paymentError instanceof Error
            ? paymentError.message
            : "Unable to initialize payment.",
        );
      } finally {
        setLoading(false);
      }
    },
    [id, locale, router],
  );

  useEffect(() => {
    fetch(`/api/wheelchairs/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.success || !data.data?.id) {
          throw new Error(data.error ?? "Invalid wheelchair");
        }

        setWheelchair(data.data);
      })
      .catch((wheelchairError) => {
        setError(
          wheelchairError instanceof Error
            ? wheelchairError.message
            : "Invalid wheelchair",
        );
      });
  }, [id]);

  useEffect(() => {
    if (bookingId && !clientSecret) {
      void initializePayment(bookingId, "retry");
    }
  }, [bookingId, clientSecret, initializePayment]);

  const [bookingPaymentStatus, setBookingPaymentStatus] = useState<
    "PENDING" | "PAID" | "EXPIRED" | null
  >(null);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">(
    "ONLINE",
  );

  useEffect(() => {
    if (bookingIdState) {
      fetch(`/api/bookings/${bookingIdState}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setBookingPaymentStatus(data.data.paymentStatus);
          }
        });
    }
  }, [bookingIdState]);

  async function handleCreateBooking() {
    const wheelchairId = id?.trim();

    if (!wheelchairId) {
      setError("Invalid wheelchair ID");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError("Please select a start and end date");
      return;
    }
    if (!customerName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!deliveryAddress.trim()) {
      setError("Delivery address is required");
      return;
    }

    if (dateRange.from >= dateRange.to) {
      setError("End date must be after start date");
      return;
    }

    const startDate = format(dateRange.from, "yyyy-MM-dd");
    const endDate = format(dateRange.to, "yyyy-MM-dd");

    setLoading(true);
    setError(null);

    try {
      logger.info("Creating booking payload", {
        wheelchairId,
        startDate,
        endDate,
        paymentMethod,
      });

      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wheelchairId,
          startDate,
          endDate,
          fullName: customerName,
          phoneNumber,
          deliveryAddress,
          deliveryNotes: deliveryNotes || undefined,
          paymentMethod,
        }),
      });
      const bookingData = await bookingResponse.json();

      if (!bookingData.success || !bookingData.data?.id) {
        throw new Error(bookingData.error ?? "Failed to create booking");
      }

      const newBookingId = bookingData.data.id;
      setBookingId(newBookingId);
      if (paymentMethod === "CASH") {
        router.push(
          `/${locale}/payment/success?bookingId=${newBookingId}&method=CASH`,
        );
        return;
      }
      await initializePayment(newBookingId, "initial");
    } catch (bookingError) {
      setError(
        bookingError instanceof Error
          ? bookingError.message
          : "Something went wrong",
      );
      setLoading(false);
    }
  }

  if (!wheelchair) {
    return (
      <div className="page-container py-20 text-center text-slate-400">
        <p>{error ?? "Loading..."}</p>
      </div>
    );
  }

  const name = locale === "ar" ? wheelchair.nameAr : wheelchair.name;
  const bookingIsPaid = bookingPaymentStatus === "PAID";
  const bookingExpired = bookingPaymentStatus === "EXPIRED";

  return (
    <div className="page-container py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="section-heading mb-2">Book Wheelchair</h1>
        <p className="mb-8 text-slate-500">{name}</p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {step === "dates" ? (
              <div className="card p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  Select Rental Dates & Delivery Details
                </h2>

                <style>{`
                  .rdp-day_selected { background-color: #0369a1 !important; }
                  .rdp-day_range_middle { background-color: #e0f2fe !important; color: #0369a1 !important; }
                  .rdp-button:hover:not([disabled]) { background-color: #f0f9ff; }
                `}</style>

                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={[{ before: new Date() }]}
                  numberOfMonths={1}
                  className="mx-auto"
                />

                <div className="mt-5 grid gap-3">
                  <input
                    className="input"
                    placeholder="Full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <textarea
                    className="input min-h-24"
                    placeholder="Delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                  <textarea
                    className="input min-h-20"
                    placeholder="Delivery notes (optional)"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Payment Method
                    </p>
                    <div className="flex gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentMethod === "ONLINE"}
                          onChange={() => setPaymentMethod("ONLINE")}
                        />
                        ONLINE (Stripe)
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentMethod === "CASH"}
                          onChange={() => setPaymentMethod("CASH")}
                        />
                        CASH on Delivery
                      </label>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreateBooking}
                  disabled={!dateRange?.from || !dateRange?.to || loading}
                  className="btn-primary mt-4 w-full justify-center py-3"
                >
                  {loading
                    ? "Processing..."
                    : paymentMethod === "CASH"
                      ? "Confirm Booking (COD)"
                      : "Next: Payment"}
                </button>
              </div>
            ) : (
              <div className="card p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  Payment Details
                </h2>

                {/* If booking is already confirmed, show success instead of Stripe */}
                {bookingIsPaid ? (
                  <div className="py-8 text-center">
                    <div className="mb-4 text-4xl text-green-500">✅</div>
                    <p className="font-semibold text-green-700">
                      Payment Confirmed!
                    </p>
                    <p className="mb-6 text-sm text-slate-500">
                      Your rental is all set.
                    </p>
                    <button
                      onClick={() => router.push(`/${locale}/dashboard`)}
                      className="btn-primary w-full justify-center"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                ) : bookingExpired ? (
                  <div className="space-y-4 py-8 text-center">
                    <p className="font-semibold text-slate-900">
                      Booking expired
                    </p>
                    <p className="text-sm text-slate-500">
                      This reservation is no longer payable. Please create a new
                      booking.
                    </p>
                    <button
                      onClick={() =>
                        router.push(`/${locale}/wheelchairs/${id}/book`)
                      }
                      className="btn-outline w-full justify-center"
                    >
                      Start New Booking
                    </button>
                  </div>
                ) : !stripePromise ? (
                  <div className="space-y-4 py-8 text-center text-red-600">
                    <p>Stripe is not configured for this environment.</p>
                  </div>
                ) : clientSecret && bookingIdState ? (
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: { theme: "stripe" } }}
                  >
                    <PaymentForm bookingId={bookingIdState} locale={locale} />
                  </Elements>
                ) : (
                  <div className="space-y-4 py-8 text-center text-slate-400">
                    <p>
                      {loading
                        ? "Loading payment form..."
                        : "Payment is not initialized yet."}
                    </p>
                    {/* ... keep your existing retry button ... */}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="card sticky top-24 p-5">
              <h3 className="mb-4 font-semibold text-slate-900">
                Booking Summary
              </h3>

              <div className="mb-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatAED(Number(wheelchair.pricePerDay))}/day
                </p>
              </div>

              {dateRange?.from && dateRange?.to ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">From</span>
                    <span className="font-medium">
                      {format(dateRange.from, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">To</span>
                    <span className="font-medium">
                      {format(dateRange.to, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium">{days} days</span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tax ({(VAT_RATE * 100).toFixed(0)}%)</span>
                    <span>{formatAED(taxAmount)}</span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary-700">
                      {formatAED(totalPrice)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  Select dates to see price
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
