"use client";

import Link from "next/link";
import { useState } from "react";
import { PaymentSuccessSync } from "./PaymentSuccessSync";

interface PaymentSuccessContentProps {
  locale: string;
  bookingId?: string;
  paymentIntentId?: string;
  method?: string;
}

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

  const isReady = syncStatus === "success";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      {!isCash && (
        <PaymentSuccessSync
          paymentIntentId={paymentIntentId}
          bookingId={bookingId}
          onSyncComplete={() => setSyncStatus("success")}
          onSyncFailed={() => setSyncStatus("failed")}
        />
      )}

      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-fade-in">
          ✅
        </div>
        <h1
          className="text-2xl font-bold text-slate-900 mb-3"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {isCash
            ? isAr
              ? "تم تأكيد طلب الدفع عند الاستلام!"
              : "Cash on Delivery Booking Confirmed!"
            : isAr
              ? "تم الدفع بنجاح!"
              : "Payment Successful!"}
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {isCash
            ? isAr
              ? "تم تأكيد حجزك. ستقوم بالدفع نقداً عند الاستلام."
              : "Your booking is confirmed. You will pay in cash on delivery."
            : isAr
              ? "تم تأكيد حجزك. ستصلك رسالة بريد إلكتروني تحتوي على تفاصيل الحجز والفاتورة."
              : "Your booking is confirmed. You'll receive a confirmation email with booking details and invoice."}
        </p>

        {syncStatus === "pending" ? (
          <p className="mb-4 text-sm text-slate-500">
            {isAr
              ? "جارٍ التحقق من حالة الدفع..."
              : "Syncing payment status... Please wait before viewing your bookings."}
          </p>
        ) : syncStatus === "failed" ? (
          <p className="mb-4 text-sm text-amber-600">
            {isAr
              ? "فشل مزامنة الدفع. حاول تحديث الصفحة إذا لم يتم تحديث الحالة تلقائيًا."
              : "Payment sync failed. Refresh the page if the status does not update automatically."}
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
            className={`btn-primary py-3 px-6 ${!isReady ? "pointer-events-none opacity-60" : ""}`}
            aria-disabled={!isReady}
          >
            {isAr ? "عرض حجوزاتي" : "View My Bookings"}
          </Link>
          <Link
            href={`/${locale}/wheelchairs`}
            className="btn-outline py-3 px-6"
          >
            {isAr ? "حجز آخر" : "Book Another"}
          </Link>
        </div>
      </div>
    </div>
  );
}
