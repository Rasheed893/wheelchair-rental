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
import type { BookingWithRelations } from "@/types";
import { formatAED } from "@/lib/currency";
import { calculateBookingPricing } from "@/lib/pricing";
import { getSecurityDeposit } from "@/lib/security-deposit";
import { buildE164Phone, COUNTRY_DIAL_CODES } from "@/lib/phone";
import { TERMS_VERSION } from "@/lib/terms";
import { logger } from "@sentry/nextjs";
import {
  DELIVERY_CITIES,
  DELIVERY_WINDOWS,
  formatDeliveryCity,
  formatDeliveryWindow,
  FREE_DELIVERY_CITIES,
  getDeliveryFee,
  PAID_DELIVERY_CITIES,
} from "@/lib/delivery";
import { buildWheelchairBookingPath } from "@/lib/seo";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface WheelchairInfo {
  id: string;
  slug?: string | null;
  name: string;
  nameAr: string;
  category: string;
  pricePerDay: number;
  images: string[];
}

type IdDocumentType = "EMIRATES_ID" | "PASSPORT";

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
  const isAr = locale === "ar";

  const [wheelchair, setWheelchair] = useState<WheelchairInfo | null>(null);
  const [existingBooking, setExistingBooking] =
    useState<BookingWithRelations | null>(null);
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
  const [deliveryCity, setDeliveryCity] =
    useState<(typeof DELIVERY_CITIES)[number]>("DUBAI");
  const [deliveryWindow, setDeliveryWindow] =
    useState<(typeof DELIVERY_WINDOWS)[number]>("MORNING");
  const [bookingPaymentStatus, setBookingPaymentStatus] = useState<
    "PENDING" | "PAID" | "EXPIRED" | null
  >(null);
  const [customerName, setCustomerName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">(
    "ONLINE",
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [idDocumentType, setIdDocumentType] =
    useState<IdDocumentType>("EMIRATES_ID");
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [idDocumentReference, setIdDocumentReference] = useState("");
  const [idDocumentReceived, setIdDocumentReceived] = useState(false);
  const [idDocumentUploading, setIdDocumentUploading] = useState(false);

  const days = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return 0;
    }

    return Math.max(1, differenceInDays(dateRange.to, dateRange.from));
  }, [dateRange]);

  const activeTotalDays = existingBooking?.totalDays ?? days;
  const activePricePerDay =
    existingBooking?.wheelchair?.pricePerDay ?? wheelchair?.pricePerDay ?? 0;
  const activeDeliveryFee = existingBooking
    ? Number(existingBooking.deliveryFee)
    : getDeliveryFee(deliveryCity);
  const { subtotal, tax, total } = calculateBookingPricing(
    activeTotalDays,
    Number(activePricePerDay),
    activeDeliveryFee,
  );
  const activeSecurityDeposit = getSecurityDeposit(
    existingBooking?.wheelchair?.category ?? wheelchair?.category,
  );
  const bookingPath = wheelchair?.slug
    ? buildWheelchairBookingPath(wheelchair.slug)
    : `/wheelchairs/${id}/book`;

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
        router.replace(`/${locale}${bookingPath}?bookingId=${targetBookingId}`);
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
    [bookingPath, locale, router],
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
    if (!wheelchair?.slug || wheelchair.slug === id) {
      return;
    }

    const query = bookingId ? `?bookingId=${bookingId}` : "";
    router.replace(
      `/${locale}${buildWheelchairBookingPath(wheelchair.slug)}${query}`,
    );
  }, [bookingId, id, locale, router, wheelchair?.slug]);

  useEffect(() => {
    if (bookingId && !clientSecret) {
      void initializePayment(bookingId, "retry");
    }
  }, [bookingId, clientSecret, initializePayment]);

  useEffect(() => {
    if (bookingIdState) {
      fetch(`/api/bookings/${bookingIdState}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setExistingBooking(data.data);
            setBookingPaymentStatus(data.data.paymentStatus);
            setDeliveryCity(data.data.deliveryCity);
            setDeliveryWindow(data.data.deliveryWindow);
            setDeliveryAddress(data.data.deliveryAddress);
            setDeliveryNotes(data.data.deliveryNotes ?? "");
            setIdDocumentReceived(Boolean(data.data.idDocumentUploadedAt));
          }
        });
    }
  }, [bookingIdState]);

  function getNormalizedContactNumber() {
    return buildE164Phone(phoneCountryCode, phoneNumber);
  }

  async function uploadIdDocument() {
    if (idDocumentReference) {
      return idDocumentReference;
    }

    if (!idDocumentFile) {
      throw new Error("Upload an Emirates ID or Passport copy.");
    }

    setIdDocumentUploading(true);

    try {
      const formData = new FormData();
      formData.append("idDocumentType", idDocumentType);
      formData.append("file", idDocumentFile);

      const response = await fetch("/api/booking/id-document", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!payload.success || !payload.data?.reference) {
        throw new Error(payload.error ?? "Unable to upload ID copy.");
      }

      setIdDocumentReference(payload.data.reference);
      setIdDocumentReceived(true);
      return payload.data.reference as string;
    } finally {
      setIdDocumentUploading(false);
    }
  }

  async function handleCreateBooking() {
    const wheelchairId = wheelchair?.id?.trim();

    if (!wheelchairId) {
      setError("Invalid wheelchair");
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
    let normalizedWhatsappNumber = "";
    try {
      normalizedWhatsappNumber = getNormalizedContactNumber();
    } catch (phoneError) {
      setError(
        phoneError instanceof Error
          ? phoneError.message
          : "Phone number is invalid",
      );
      return;
    }
    if (!deliveryAddress.trim()) {
      setError("Delivery address is required");
      return;
    }
    if (!idDocumentFile && !idDocumentReference) {
      setError("Upload an Emirates ID or Passport copy.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions.");
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

      const uploadedIdDocumentReference = await uploadIdDocument();

      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wheelchairId,
          startDate,
          endDate,
          fullName: customerName,
          phoneNumber: normalizedWhatsappNumber,
          whatsappNumber: normalizedWhatsappNumber,
          deliveryCity,
          deliveryWindow,
          deliveryAddress,
          deliveryNotes: deliveryNotes || undefined,
          paymentMethod,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          idDocumentType,
          idDocumentUrl: uploadedIdDocumentReference,
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

  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const bookingIsPaid = bookingPaymentStatus === "PAID";
  const bookingExpired = bookingPaymentStatus === "EXPIRED";

  return (
    <div className="page-container overflow-x-hidden py-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="section-heading mb-2">Book Wheelchair</h1>
        <p className="mb-8 text-slate-500">{name}</p>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <div className="min-w-0">
            {step === "dates" ? (
              <div className="card overflow-hidden p-4 sm:p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  Select Rental Dates & Delivery Details
                </h2>

                <style>{`
                  .booking-day-picker {
                    --rdp-day-width: 36px;
                    --rdp-day-height: 36px;
                    --rdp-day_button-width: 34px;
                    --rdp-day_button-height: 34px;
                    --rdp-nav_button-width: 2rem;
                    --rdp-nav_button-height: 2rem;
                    width: 100%;
                    max-width: 312px;
                  }
                  @media (min-width: 640px) {
                    .booking-day-picker {
                      --rdp-day-width: 44px;
                      --rdp-day-height: 44px;
                      --rdp-day_button-width: 42px;
                      --rdp-day_button-height: 42px;
                      max-width: 360px;
                    }
                  }
                  .rdp-day_selected { background-color: #0369a1 !important; }
                  .rdp-day_range_middle { background-color: #e0f2fe !important; color: #0369a1 !important; }
                  .rdp-button:hover:not([disabled]) { background-color: #f0f9ff; }
                `}</style>

                <div className="flex w-full justify-center">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={[{ before: new Date() }]}
                    numberOfMonths={1}
                    className="booking-day-picker"
                  />
                </div>

                <div className="mt-5 grid gap-3">
                  <input
                    className="input-field"
                    placeholder="Full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <div className="min-w-0 rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Contact WhatsApp / phone number
                    </p>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
                      <div>
                        <input
                          className="input-field"
                          list="booking-country-codes"
                          inputMode="tel"
                          placeholder="+971"
                          aria-label="Country code"
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                        />
                        <datalist id="booking-country-codes">
                          {COUNTRY_DIAL_CODES.map((country) => (
                            <option
                              key={`${country.code}-${country.label}`}
                              value={country.code}
                            >
                              {country.label}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <input
                        className="input-field min-w-0"
                        placeholder="Contact number"
                        inputMode="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      UAE and international numbers are supported and saved in
                      E.164 format.
                    </p>
                  </div>
                  <select
                    className="input-field"
                    value={deliveryCity}
                    onChange={(e) =>
                      setDeliveryCity(
                        e.target.value as (typeof DELIVERY_CITIES)[number],
                      )
                    }
                  >
                    <optgroup label="Free Delivery">
                      {FREE_DELIVERY_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {formatDeliveryCity(city)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="+ AED 150 Delivery Fee">
                      {PAID_DELIVERY_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {formatDeliveryCity(city)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <select
                    className="input-field"
                    value={deliveryWindow}
                    onChange={(e) =>
                      setDeliveryWindow(
                        e.target.value as (typeof DELIVERY_WINDOWS)[number],
                      )
                    }
                  >
                    {DELIVERY_WINDOWS.map((window) => (
                      <option key={window} value={window}>
                        {formatDeliveryWindow(window)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    Free delivery within Ajman, Sharjah, Dubai & UAQ. Additional
                    fee applies for other emirates.
                  </p>
                  <textarea
                    className="input-field min-h-24"
                    placeholder="Street / building / apartment"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                  <textarea
                    className="input-field min-h-20"
                    placeholder="Floor / instructions (optional)"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                  <div className="min-w-0 rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      ID copy
                    </p>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <select
                        className="input-field"
                        value={idDocumentType}
                        onChange={(e) => {
                          setIdDocumentType(e.target.value as IdDocumentType);
                          setIdDocumentReference("");
                          setIdDocumentReceived(false);
                        }}
                      >
                        <option value="EMIRATES_ID">Emirates ID</option>
                        <option value="PASSPORT">Passport</option>
                      </select>
                      <input
                        className="input-field min-w-0"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          setIdDocumentFile(e.target.files?.[0] ?? null);
                          setIdDocumentReference("");
                          setIdDocumentReceived(false);
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Digital copy accepted. Admin-only access; customer view
                      will only show ID copy received.
                    </p>
                    {idDocumentReceived && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        ID copy received
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Payment Method
                    </p>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                        <input
                          type="radio"
                          checked={paymentMethod === "ONLINE"}
                          onChange={() => setPaymentMethod("ONLINE")}
                        />
                        ONLINE (Stripe)
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                        <input
                          type="radio"
                          checked={paymentMethod === "CASH"}
                          onChange={() => setPaymentMethod("CASH")}
                        />
                        CASH on Delivery
                      </label>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <label className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                      />
                      <span>
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setTermsOpen(true)}
                          className="font-medium text-primary-700 underline"
                        >
                          Terms & Conditions
                        </button>{" "}
                        and rental agreement requirements.
                      </span>
                    </label>
                    {/* <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="mt-2 text-xs font-medium text-primary-700 underline"
                    >
                      View terms without leaving this booking
                    </button> */}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreateBooking}
                  disabled={
                    !dateRange?.from ||
                    !dateRange?.to ||
                    loading ||
                    idDocumentUploading ||
                    !termsAccepted
                  }
                  className="btn-primary mt-4 w-full justify-center py-3"
                >
                  {loading || idDocumentUploading
                    ? "Processing..."
                    : paymentMethod === "CASH"
                      ? "Confirm Booking (COD)"
                      : "Next: Payment"}
                </button>
              </div>
            ) : (
              <div className="card overflow-hidden p-4 sm:p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  Payment Details
                </h2>

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
                      onClick={() => router.push(`/${locale}${bookingPath}`)}
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
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="card p-4 sm:p-5 lg:sticky lg:top-24">
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
                    <span>Delivery Fee</span>
                    <span>{formatAED(activeDeliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>VAT (5%)</span>
                    <span>{formatAED(tax)}</span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary-700">{formatAED(total)}</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    Refundable security deposit due on delivery:{" "}
                    <span className="font-semibold">
                      {formatAED(activeSecurityDeposit)}
                    </span>
                  </div>
                </div>
              ) : existingBooking ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">From</span>
                    <span className="font-medium">
                      {format(
                        new Date(existingBooking.startDate),
                        "MMM d, yyyy",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">To</span>
                    <span className="font-medium">
                      {format(new Date(existingBooking.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium">
                      {existingBooking.totalDays} days
                    </span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Delivery Fee</span>
                    <span>{formatAED(activeDeliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>VAT (5%)</span>
                    <span>{formatAED(tax)}</span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary-700">{formatAED(total)}</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    Refundable security deposit due on delivery:{" "}
                    <span className="font-semibold">
                      {formatAED(activeSecurityDeposit)}
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

      {termsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-terms-title"
        >
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:mx-auto sm:max-w-2xl sm:rounded-2xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="booking-terms-title"
                  className="font-semibold text-slate-900"
                >
                  Terms & Conditions
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Version {TERMS_VERSION}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <p>
                UAE residents and tourists are accepted. Customers must be 18+
                and provide a digital Emirates ID or Passport copy.
              </p>
              <p>
                Please provide a reachable contact number. Admin confirmation,
                where needed, is normally completed within 24 hours. Delivery
                windows are estimates.
              </p>
              <p>
                The refundable security deposit is collected upon delivery and
                refunded after pickup and inspection, normally within 24 to 72
                hours. Damage, loss, theft, missing accessories, lost chargers,
                or battery damage may be deducted.
              </p>
              <p>
                You must sign the rental agreement upon delivery. Full legal
                terms remain available on the dedicated Terms & Conditions page
                outside the booking flow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
