"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentSuccessSync } from "./PaymentSuccessSync";

interface PaymentSuccessContentProps {
  locale: string;
  bookingId?: string;
  paymentIntentId?: string;
  method?: string;
}

type BookingPaymentStatus = "PENDING" | "PAID" | "EXPIRED";
type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

export default function PaymentSuccessContent({
  locale,
  bookingId,
  paymentIntentId,
  method,
}: PaymentSuccessContentProps) {
  const isAr = locale === "ar";
  const isCash = method === "CASH";
  const [syncStatus, setSyncStatus] = useState<
    "pending" | "success" | "failed"
  >(isCash ? "success" : "pending");
  const [paymentStatus, setPaymentStatus] =
    useState<BookingPaymentStatus | null>(isCash ? "PAID" : null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(
    isCash ? "CONFIRMED" : null,
  );
  const [hasHydratedBooking, setHasHydratedBooking] = useState(
    isCash || !bookingId,
  );
  // const [supportPhone, setSupportPhone] = useState("");

  useEffect(() => {
    if (!bookingId || isCash) {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data?.success) {
          if (typeof data.data?.paymentStatus === "string") {
            const nextPaymentStatus =
              data.data.paymentStatus as BookingPaymentStatus;
            setPaymentStatus(nextPaymentStatus);
            if (nextPaymentStatus === "PAID") {
              setSyncStatus("success");
            }
          }

          if (typeof data.data?.status === "string") {
            const nextBookingStatus = data.data.status as BookingStatus;
            setBookingStatus(nextBookingStatus);
            if (nextBookingStatus === "CANCELLED") {
              setSyncStatus("failed");
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        // Best-effort hydration only.
      } finally {
        setHasHydratedBooking(true);
      }
    })();

    return () => controller.abort();
  }, [bookingId, isCash]);

  // useEffect(() => {
  //   fetch("/api/config/support-phone")
  //     .then((res) => res.json())
  //     .then((data) => {
  //       if (data.success && typeof data.data?.supportPhone === "string") {
  //         setSupportPhone(data.data.supportPhone);
  //       }
  //     })
  //     .catch(() => {
  //       setSupportPhone("");
  //     });
  // }, []);

  const isReady = isCash || paymentStatus === "PAID";
  const isExpired = paymentStatus === "EXPIRED";
  const isCancelled = bookingStatus === "CANCELLED";

  let title = isAr ? "جار التحقق من الدفع" : "Payment Processing";
  let description = isAr
    ? "ننتظر تأكيد الدفع من Stripe. سيتم تحديث الحالة تلقائيا عند تأكيد الدفع."
    : "We're waiting for Stripe to confirm the payment. This page will update automatically when the booking is marked as paid.";

  if (isCash) {
    title = isAr
      ? "تم تأكيد طلب الدفع عند الاستلام!"
      : "Cash on Delivery Booking Confirmed!";
    description = isAr
      ? "تم تأكيد حجزك. ستقوم بالدفع نقدا عند الاستلام."
      : "Your booking is confirmed. You will pay in cash on delivery.";
  } else if (paymentStatus === "PAID") {
    title = isAr ? "تم الدفع بنجاح!" : "Payment Successful!";
    description = isAr
      ? "تم تأكيد حجزك. ستصلك رسالة بريد إلكتروني تحتوي على تفاصيل الحجز والفاتورة."
      : "Your booking is confirmed. You'll receive a confirmation email with booking details and invoice.";
  } else if (isCancelled) {
    title = isAr ? "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062d\u062c\u0632" : "Booking Cancelled";
    description = isAr
      ? "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062d\u062c\u0632 \u0628\u0646\u062c\u0627\u062d. \u0644\u0646 \u0646\u062a\u0627\u0628\u0639 \u062a\u0632\u0627\u0645\u0646 \u0627\u0644\u062f\u0641\u0639 \u0644\u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632."
      : "This booking was cancelled, so payment sync has been skipped.";
  } else if (isExpired) {
    title = isAr ? "انتهى الحجز" : "Booking Expired";
    description = isAr
      ? "لم يكتمل الدفع خلال مدة الحجز. يرجى إنشاء حجز جديد."
      : "This reservation expired before payment completed. Please create a new booking.";
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      {!isCash && (
        <PaymentSuccessSync
          paymentIntentId={paymentIntentId}
          bookingId={bookingId}
          bookingStatus={bookingStatus}
          paymentStatus={paymentStatus}
          syncReady={hasHydratedBooking}
          onSyncComplete={(result) => {
            if (result.ignored) {
              setSyncStatus("failed");
            }
            if (result.bookingStatus) {
              setBookingStatus(result.bookingStatus);
            }
            if (result.paymentStatus) {
              setPaymentStatus(result.paymentStatus);
              setSyncStatus(
                result.paymentStatus === "PAID" ? "success" : "failed",
              );
            }
          }}
          onSyncFailed={() => setSyncStatus("failed")}
        />
      )}

      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-fade-in">
          {isExpired ? "!" : "OK"}
        </div>
        <h1
          className="text-2xl font-bold text-slate-900 mb-3"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {title}
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">{description}</p>
        {isReady && (
          <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            {isAr
              ? "تلقينا طلبك! سيقوم فريقنا بتأكيد موعد التسليم خلال ساعتين. للطلبات العاجلة اتصل بنا:"
              : "We've received your booking! Our team will confirm your delivery window within 2 hours. For urgent requests call:"}{" "}
            <a
              href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`}
              className="font-bold underline"
            >
              {process.env.NEXT_PUBLIC_SUPPORT_PHONE}
            </a>
          </div>
        )}

        {syncStatus === "pending" && paymentStatus !== "PAID" && !isCancelled ? (
          <p className="mb-4 text-sm text-slate-500">
            {isAr
              ? "جار التحقق من حالة الدفع..."
              : "Syncing payment status... Please wait before viewing your bookings."}
          </p>
        ) : syncStatus === "failed" && !isExpired && !isCancelled ? (
          <p className="mb-4 text-sm text-amber-600">
            {isAr
              ? "لم يتم تأكيد الدفع بعد. سيبقى الحجز قيد الانتظار حتى يؤكده Stripe أو ينتهي."
              : "Payment is not marked as paid yet. The booking will stay pending until Stripe confirms it or the reservation expires."}
          </p>
        ) : null}

        {bookingId && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-600">
            {isAr ? "رقم الحجز:" : "Booking ID:"}{" "}
            <span className="font-mono font-bold">
              {bookingId.slice(-8).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/dashboard`}
            className={`btn-primary py-3 px-6 ${!isReady && !isCancelled ? "pointer-events-none opacity-60" : ""}`}
            aria-disabled={!isReady && !isCancelled}
          >
            {isAr ? "عرض حجوزاتي" : "View My Bookings"}
          </Link>
          <Link
            href={`/${locale}/wheelchairs`}
            className="btn-outline py-3 px-6"
          >
            {isAr ? "حجز جديد" : "Book Another"}
          </Link>
        </div>
      </div>
    </div>
  );
}
