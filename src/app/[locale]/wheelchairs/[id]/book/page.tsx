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
import { getTermsContent } from "@/lib/terms-content";
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

type IdDocumentUpload = {
  reference: string;
  publicId: string;
  resourceType: "image" | "raw" | "video";
  deliveryType: "authenticated" | "private";
  format?: string | null;
  version?: string | null;
  originalFilename?: string | null;
};

function PaymentForm({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const isAr = locale === "ar";
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
    <form
      onSubmit={handleSubmit}
      className={isAr ? "space-y-4 text-right" : "space-y-4"}
      dir={isAr ? "rtl" : "ltr"}
    >
      <PaymentElement />
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {loading
          ? isAr
            ? "جاري المعالجة..."
            : "Processing..."
          : isAr
            ? "ادفع الآن"
            : "Pay Now"}
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
  const termsContent = getTermsContent(locale);

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
  const [idDocumentUpload, setIdDocumentUpload] =
    useState<IdDocumentUpload | null>(null);
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
    if (idDocumentReference && idDocumentUpload) {
      return idDocumentUpload;
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

      if (
        !payload.success ||
        !payload.data?.reference ||
        !payload.data?.publicId ||
        !payload.data?.resourceType ||
        !payload.data?.deliveryType
      ) {
        throw new Error(payload.error ?? "Unable to upload ID copy.");
      }

      const upload = payload.data as IdDocumentUpload;
      setIdDocumentReference(upload.reference);
      setIdDocumentUpload(upload);
      setIdDocumentReceived(true);
      return upload;
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

      const uploadedIdDocument = await uploadIdDocument();

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
          idDocumentUrl: uploadedIdDocument.reference,
          idDocumentPublicId: uploadedIdDocument.publicId,
          idDocumentResourceType: uploadedIdDocument.resourceType,
          idDocumentDeliveryType: uploadedIdDocument.deliveryType,
          idDocumentFormat: uploadedIdDocument.format ?? undefined,
          idDocumentVersion: uploadedIdDocument.version ?? undefined,
          idDocumentOriginalFilename:
            uploadedIdDocument.originalFilename ?? undefined,
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
  const alignClass = isAr ? "text-right" : "text-left";
  const fieldClass = `input-field ${isAr ? "text-right" : ""}`;
  const copy = {
    title: isAr ? "حجز كرسي متحرك" : "Book Wheelchair",
    detailsTitle: isAr
      ? "اختر تواريخ التأجير وتفاصيل التوصيل"
      : "Select Rental Dates & Delivery Details",
    fullName: isAr ? "الاسم الكامل" : "Full name",
    phoneLabel: isAr
      ? "رقم واتساب / الهاتف"
      : "Contact WhatsApp / phone number",
    countryCode: isAr ? "رمز الدولة" : "Country code",
    phonePlaceholder: isAr ? "رقم التواصل" : "Contact number",
    phoneHelp: isAr
      ? "ندعم أرقام الإمارات والأرقام الدولية، ويتم حفظها بصيغة E.164."
      : "UAE and international numbers are supported and saved in E.164 format.",
    freeDelivery: isAr ? "توصيل مجاني" : "Free Delivery",
    paidDelivery: isAr ? "+ 150 درهم رسوم توصيل" : "+ AED 150 Delivery Fee",
    deliveryHelp: isAr
      ? "التوصيل مجاني داخل عجمان والشارقة ودبي وأم القيوين. تطبق رسوم إضافية على الإمارات الأخرى."
      : "Free delivery within Ajman, Sharjah, Dubai & UAQ. Additional fee applies for other emirates.",
    address: isAr ? "الشارع / المبنى / الشقة" : "Street / building / apartment",
    notes: isAr
      ? "الطابق / تعليمات إضافية (اختياري)"
      : "Floor / instructions (optional)",
    idCopy: isAr ? "نسخة الهوية" : "ID copy",
    emiratesId: isAr ? "الهوية الإماراتية" : "Emirates ID",
    passport: isAr ? "جواز السفر" : "Passport",
    idHelp: isAr
      ? "تقبل النسخة الرقمية. الوصول للإدارة فقط، وسيظهر للعميل أن نسخة الهوية تم استلامها."
      : "Digital copy accepted. Admin-only access; customer view will only show ID copy received.",
    paymentMethod: isAr ? "طريقة الدفع" : "Payment Method",
    online: isAr ? "الدفع الإلكتروني (Stripe)" : "ONLINE (Stripe)",
    cash: isAr ? "الدفع نقدا عند التوصيل" : "CASH on Delivery",
    termsPrefix: isAr ? "أوافق على " : "I agree to the ",
    termsLink: isAr ? "الشروط والأحكام" : "Terms & Conditions",
    termsSuffix: isAr
      ? " ومتطلبات اتفاقية التأجير."
      : " and rental agreement requirements.",
    processing: isAr ? "جاري المعالجة..." : "Processing...",
    confirmCash: isAr
      ? "تأكيد الحجز (الدفع عند التوصيل)"
      : "Confirm Booking (COD)",
    nextPayment: isAr ? "التالي: الدفع" : "Next: Payment",
    paymentDetails: isAr ? "تفاصيل الدفع" : "Payment Details",
    paymentConfirmed: isAr ? "تم تأكيد الدفع!" : "Payment Confirmed!",
    rentalSet: isAr ? "تم تأكيد طلب التأجير." : "Your rental is all set.",
    dashboard: isAr ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard",
    bookingExpired: isAr ? "انتهت صلاحية الحجز" : "Booking expired",
    bookingExpiredBody: isAr
      ? "لم يعد هذا الحجز قابلا للدفع. يرجى إنشاء حجز جديد."
      : "This reservation is no longer payable. Please create a new booking.",
    startNew: isAr ? "بدء حجز جديد" : "Start New Booking",
    stripeMissing: isAr
      ? "Stripe غير مهيأ لهذه البيئة."
      : "Stripe is not configured for this environment.",
    paymentLoading: isAr
      ? "جاري تحميل نموذج الدفع..."
      : "Loading payment form...",
    paymentNotReady: isAr
      ? "لم يتم تهيئة الدفع بعد."
      : "Payment is not initialized yet.",
    summary: isAr ? "ملخص الحجز" : "Booking Summary",
    from: isAr ? "من" : "From",
    to: isAr ? "إلى" : "To",
    duration: isAr ? "المدة" : "Duration",
    days: isAr ? "أيام" : "days",
    subtotal: isAr ? "المجموع الفرعي" : "Subtotal",
    deliveryFee: isAr ? "رسوم التوصيل" : "Delivery Fee",
    vat: isAr ? "ضريبة القيمة المضافة (5%)" : "VAT (5%)",
    total: isAr ? "الإجمالي" : "Total",
    deposit: isAr
      ? "التأمين المسترد عند التوصيل:"
      : "Refundable security deposit due on delivery:",
    selectDates: isAr
      ? "اختر التواريخ لعرض السعر"
      : "Select dates to see price",
    termsTitle: isAr ? "الشروط والأحكام" : "Terms & Conditions",
    version: isAr ? "الإصدار" : "Version",
    close: isAr ? "إغلاق" : "Close",
  };

  return (
    <div
      className={`page-container overflow-x-hidden py-6 sm:py-10 ${alignClass}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-5xl">
        <h1 className="section-heading mb-2">{copy.title}</h1>
        <p className="mb-8 text-slate-500">{name}</p>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <div className="min-w-0">
            {step === "dates" ? (
              <div className="card overflow-hidden p-4 sm:p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  {copy.detailsTitle}
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
                  .booking-day-picker[dir="rtl"] .rdp-month_caption {
                    justify-content: center;
                    text-align: center;
                  }
                  .booking-day-picker[dir="rtl"] .rdp-nav {
                    direction: ltr;
                  }
                `}</style>

                <div className="flex w-full justify-center">
                  <DayPicker
                    dir={isAr ? "rtl" : "ltr"}
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
                    className={fieldClass}
                    placeholder={copy.fullName}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <div className="min-w-0 rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      {copy.phoneLabel}
                    </p>
                    <div
                      className="grid min-w-0 gap-2 sm:grid-cols-[130px_minmax(0,1fr)]"
                      dir="ltr"
                    >
                      <div>
                        <input
                          className="input-field text-left"
                          list="booking-country-codes"
                          inputMode="tel"
                          placeholder="+971"
                          aria-label={copy.countryCode}
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
                        className="input-field min-w-0 text-left"
                        placeholder={copy.phonePlaceholder}
                        dir="ltr"
                        inputMode="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {copy.phoneHelp}
                    </p>
                  </div>
                  <select
                    className={fieldClass}
                    value={deliveryCity}
                    onChange={(e) =>
                      setDeliveryCity(
                        e.target.value as (typeof DELIVERY_CITIES)[number],
                      )
                    }
                  >
                    <optgroup label={copy.freeDelivery}>
                      {FREE_DELIVERY_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {formatDeliveryCity(city)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={copy.paidDelivery}>
                      {PAID_DELIVERY_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {formatDeliveryCity(city)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <select
                    className={fieldClass}
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
                  <p className="text-xs text-slate-500">{copy.deliveryHelp}</p>
                  <textarea
                    className={`${fieldClass} min-h-24`}
                    placeholder={copy.address}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                  <textarea
                    className={`${fieldClass} min-h-20`}
                    placeholder={copy.notes}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                  <div className="min-w-0 rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      {copy.idCopy}
                    </p>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <select
                        className={fieldClass}
                        value={idDocumentType}
                        onChange={(e) => {
                          setIdDocumentType(e.target.value as IdDocumentType);
                          setIdDocumentReference("");
                          setIdDocumentUpload(null);
                          setIdDocumentReceived(false);
                        }}
                      >
                        <option value="EMIRATES_ID">{copy.emiratesId}</option>
                        <option value="PASSPORT">{copy.passport}</option>
                      </select>
                      <input
                        className="input-field min-w-0 max-w-full overflow-hidden file:me-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          setIdDocumentFile(e.target.files?.[0] ?? null);
                          setIdDocumentReference("");
                          setIdDocumentUpload(null);
                          setIdDocumentReceived(false);
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{copy.idHelp}</p>
                    {/* {idDocumentReceived && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        ID copy received
                      </p>
                    )} */}
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      {copy.paymentMethod}
                    </p>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <label className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-100 p-3">
                        <input
                          type="radio"
                          className="shrink-0"
                          checked={paymentMethod === "ONLINE"}
                          onChange={() => setPaymentMethod("ONLINE")}
                        />
                        <span className="min-w-0 flex-1">{copy.online}</span>
                      </label>
                      <label className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-100 p-3">
                        <input
                          type="radio"
                          className="shrink-0"
                          checked={paymentMethod === "CASH"}
                          onChange={() => setPaymentMethod("CASH")}
                        />
                        <span className="min-w-0 flex-1">{copy.cash}</span>
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
                        {copy.termsPrefix}
                        <button
                          type="button"
                          onClick={() => setTermsOpen(true)}
                          className="font-medium text-primary-700 underline"
                        >
                          {copy.termsLink}
                        </button>{" "}
                        {copy.termsSuffix}
                      </span>
                    </label>
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
                    ? copy.processing
                    : paymentMethod === "CASH"
                      ? copy.confirmCash
                      : copy.nextPayment}
                </button>
              </div>
            ) : (
              <div className="card overflow-hidden p-4 sm:p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  {copy.paymentDetails}
                </h2>

                {bookingIsPaid ? (
                  <div className="py-8 text-center">
                    <div className="mb-4 text-4xl text-green-500">✅</div>
                    <p className="font-semibold text-green-700">
                      {copy.paymentConfirmed}
                    </p>
                    <p className="mb-6 text-sm text-slate-500">
                      {copy.rentalSet}
                    </p>
                    <button
                      onClick={() => router.push(`/${locale}/dashboard`)}
                      className="btn-primary w-full justify-center"
                    >
                      {copy.dashboard}
                    </button>
                  </div>
                ) : bookingExpired ? (
                  <div className="space-y-4 py-8 text-center">
                    <p className="font-semibold text-slate-900">
                      {copy.bookingExpired}
                    </p>
                    <p className="text-sm text-slate-500">
                      {copy.bookingExpiredBody}
                    </p>
                    <button
                      onClick={() => router.push(`/${locale}${bookingPath}`)}
                      className="btn-outline w-full justify-center"
                    >
                      {copy.startNew}
                    </button>
                  </div>
                ) : !stripePromise ? (
                  <div className="space-y-4 py-8 text-center text-red-600">
                    <p>{copy.stripeMissing}</p>
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
                      {loading ? copy.paymentLoading : copy.paymentNotReady}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div
              className={`card p-4 sm:p-5 lg:sticky lg:top-24 ${alignClass}`}
            >
              <h3 className="mb-4 font-semibold text-slate-900">
                {copy.summary}
              </h3>

              <div className="mb-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{name}</p>
                <p className="mt-1 text-xs text-slate-400" dir="ltr">
                  {formatAED(Number(wheelchair.pricePerDay))}/day
                </p>
              </div>

              {dateRange?.from && dateRange?.to ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{copy.from}</span>
                    <span className="font-medium" dir="ltr">
                      {format(dateRange.from, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{copy.to}</span>
                    <span className="font-medium" dir="ltr">
                      {format(dateRange.to, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{copy.duration}</span>
                    <span className="font-medium" dir="ltr">
                      {days} {copy.days}
                    </span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{copy.subtotal}</span>
                    <span dir="ltr">{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{copy.deliveryFee}</span>
                    <span dir="ltr">{formatAED(activeDeliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{copy.vat}</span>
                    <span dir="ltr">{formatAED(tax)}</span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-base font-bold">
                    <span>{copy.total}</span>
                    <span className="text-primary-700" dir="ltr">
                      {formatAED(total)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    {copy.deposit}{" "}
                    <span className="font-semibold" dir="ltr">
                      {formatAED(activeSecurityDeposit)}
                    </span>
                  </div>
                </div>
              ) : existingBooking ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{copy.from}</span>
                    <span className="font-medium" dir="ltr">
                      {format(
                        new Date(existingBooking.startDate),
                        "MMM d, yyyy",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{copy.to}</span>
                    <span className="font-medium" dir="ltr">
                      {format(new Date(existingBooking.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{copy.duration}</span>
                    <span className="font-medium" dir="ltr">
                      {existingBooking.totalDays} {copy.days}
                    </span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{copy.subtotal}</span>
                    <span dir="ltr">{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{copy.deliveryFee}</span>
                    <span dir="ltr">{formatAED(activeDeliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{copy.vat}</span>
                    <span dir="ltr">{formatAED(tax)}</span>
                  </div>
                  <hr className="my-2 border-slate-100" />
                  <div className="flex justify-between text-base font-bold">
                    <span>{copy.total}</span>
                    <span className="text-primary-700" dir="ltr">
                      {formatAED(total)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    {copy.deposit}{" "}
                    <span className="font-semibold" dir="ltr">
                      {formatAED(activeSecurityDeposit)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  {copy.selectDates}
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
          <div
            className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:mx-auto sm:max-w-2xl sm:rounded-2xl ${alignClass}`}
            dir={isAr ? "rtl" : "ltr"}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h2
                  id="booking-terms-title"
                  className="font-semibold text-slate-900"
                >
                  {copy.termsTitle}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {copy.version} <span dir="ltr">{TERMS_VERSION}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              >
                {copy.close}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <p className="mb-5 text-sm leading-6 text-slate-500">
                {termsContent.intro}
              </p>
              <ol className="space-y-5">
                {termsContent.sections.map((section, sectionIndex) => (
                  <li key={section.title}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">
                      <span dir="ltr" className="inline-block">
                        {sectionIndex + 1}.
                      </span>{" "}
                      {section.title}
                    </h3>
                    <ul
                      className={`space-y-2 text-sm leading-6 text-slate-600 ${
                        isAr ? "pr-5" : "pl-5"
                      }`}
                    >
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="list-disc rounded-lg bg-slate-50 p-3 marker:text-primary-600"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
