// src/app/[locale]/dashboard/bookings/[id]/page.tsx
"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import type { BookingWithRelations } from "@/types";
import { formatAED } from "@/lib/currency";
import { VAT_RATE, calculateTax, calculateTotal } from "@/lib/pricing";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-red",
  COMPLETED: "badge-blue",
  EXPIRED: "badge-gray",
};

const PAY_STATUS: Record<string, string> = {
  PENDING: "badge-yellow",
  PAID: "badge-green",
};

export default function BookingDetailPage({ params }: Props) {
  const { locale, id } = use(params);
  const isAr = locale === "ar";
  const router = useRouter();

  const [booking, setBooking] = useState<BookingWithRelations | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [supportPhone, setSupportPhone] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookings/${id}`).then((r) => r.json()),
      fetch(`/api/bookings/${id}/invoice`).then((r) => r.json()),
    ]).then(([bookingData, invoiceData]) => {
      if (bookingData.success) setBooking(bookingData.data);
      if (invoiceData.success) setInvoice(invoiceData.data);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    fetch("/api/config/support-phone")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && typeof data.data?.supportPhone === "string") {
          setSupportPhone(data.data.supportPhone);
        }
      })
      .catch(() => {
        setSupportPhone("");
      });
  }, []);

  async function handleCancel() {
    if (!confirm(isAr ? "هل أنت متأكد؟" : "Are you sure you want to cancel?"))
      return;
    setCancelling(true);
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelled by customer" }),
    });
    router.push(`/${locale}/dashboard`);
  }

  if (loading) {
    return (
      <div className="page-container py-10 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="card p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-container py-16 text-center text-slate-400">
        <p>{isAr ? "الحجز غير موجود" : "Booking not found"}</p>
        <Link
          href={`/${locale}/dashboard`}
          className="btn-primary mt-4 inline-flex"
        >
          {isAr ? "العودة" : "Go Back"}
        </Link>
      </div>
    );
  }

  const name = isAr ? booking.wheelchair.nameAr : booking.wheelchair.name;
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);
  const isPending = booking.status === "PENDING" && booking.paymentMethod === "ONLINE";
  const subtotal = Number(invoice?.subtotal ?? booking.totalPrice);
  const taxAmount = Number(invoice?.taxAmount ?? calculateTax(subtotal, VAT_RATE));
  const totalAmount = Number(
    invoice?.totalAmount ?? booking.payment?.amount ?? calculateTotal(subtotal, VAT_RATE),
  );

  return (
    <div className="page-container py-10">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link
            href={`/${locale}/dashboard`}
            className="hover:text-primary-600"
          >
            {isAr ? "حجوزاتي" : "My Bookings"}
          </Link>
          <span>/</span>
          <span className="text-slate-600">
            #{booking.id.slice(-8).toUpperCase()}
          </span>
        </nav>

        {/* Status banner */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  {isAr ? "في انتظار الدفع" : "Payment Pending"}
                </p>
                <p className="text-amber-700 text-xs">
                  {isAr
                    ? "أكمل عملية الدفع لتأكيد حجزك"
                    : "Complete payment to confirm your booking"}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/wheelchairs/${booking.wheelchairId}/book?bookingId=${booking.id}`}
              className="btn-primary py-2 px-4 text-sm shrink-0"
            >
              {isAr ? "أكمل الدفع" : "Pay Now"}
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main details */}
          <div className="md:col-span-2 space-y-5">
            {/* Booking card */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={STATUS_BADGE[booking.status]}>
                      {booking.status}
                    </span>
                  </div>
                  <h1
                    className="text-xl font-bold text-slate-900"
                    style={{ fontFamily: "var(--font-sora)" }}
                  >
                    {name}
                  </h1>
                  <p className="text-slate-400 text-xs mt-1">
                    {isAr ? "رقم الحجز: " : "Booking ID: "}
                    <span className="font-mono">
                      #{booking.id.slice(-8).toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    {isAr ? "تاريخ البداية" : "Start Date"}
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {format(new Date(booking.startDate), "EEEE, MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    {isAr ? "تاريخ النهاية" : "End Date"}
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {format(new Date(booking.endDate), "EEEE, MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    {isAr ? "المدة" : "Duration"}
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {booking.totalDays}{" "}
                    {isAr ? "يوم" : booking.totalDays === 1 ? "day" : "days"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    {isAr ? "السعر اليومي" : "Daily Rate"}
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {formatAED(Number(booking.wheelchair.pricePerDay))}/
                    {isAr ? "يوم" : "day"}
                  </p>
                </div>
              </div>

              {booking.deliveryNotes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    {isAr ? "ملاحظات التوصيل" : "Delivery Notes"}
                  </p>
                  <p className="text-sm text-blue-800">{booking.deliveryNotes}</p>
                </div>
              )}

              <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-medium mb-1">
                  📞 {isAr ? "الهاتف" : "Phone"}
                </p>
                <p className="text-sm text-slate-700">{booking.phoneNumber}</p>
                <p className="mt-3 text-xs text-slate-500 font-medium mb-1">
                  📍 {isAr ? "عنوان التوصيل" : "Delivery Address"}
                </p>
                <p className="text-sm text-slate-700">{booking.deliveryAddress}</p>
              </div>

              {booking.cancelledAt && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-600 font-medium mb-1">
                    {isAr ? "سبب الإلغاء" : "Cancellation"}
                  </p>
                  <p className="text-sm text-red-800">
                    {format(new Date(booking.cancelledAt), "MMM d, yyyy")}
                    {booking.cancelReason && ` — ${booking.cancelReason}`}
                  </p>
                  {supportPhone && (
                    <p className="text-sm text-red-800 mt-2">
                      {isAr ? "للمساعدة اتصل على: " : "Need help? Call: "}
                      <a className="underline font-semibold" href={`tel:${supportPhone}`}>
                        {supportPhone}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {canCancel && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="btn-danger py-2 px-4 text-sm"
                  >
                    {cancelling
                      ? isAr
                        ? "جاري الإلغاء..."
                        : "Cancelling..."
                      : isAr
                        ? "إلغاء الحجز"
                        : "Cancel Booking"}
                  </button>
                </div>
              )}
            </div>

            {/* Payment info */}
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-4">
                💳 {isAr ? "معلومات الدفع" : "Payment Info"}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {isAr ? "طريقة الدفع" : "Method"}
                  </span>
                  <span>{booking.paymentMethod === "CASH" ? "Cash on Delivery" : "Online (Stripe)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {isAr ? "الحالة" : "Payment Status"}
                  </span>
                  <span className={PAY_STATUS[booking.paymentStatus]}>
                    {booking.paymentStatus === "PAID"
                      ? isAr
                        ? "🟢 مدفوع"
                        : "🟢 Paid"
                      : booking.paymentMethod === "CASH"
                        ? isAr
                          ? "🟡 معلق (الدفع عند الاستلام)"
                          : "🟡 Pending (Cash on Delivery)"
                        : isAr
                          ? "🟡 بانتظار الدفع"
                          : "🟡 Pending"}
                  </span>
                </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isAr ? "المبلغ الأساسي" : "Subtotal"}
                    </span>
                    <span className="font-semibold">{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isAr
                        ? `ضريبة (${(VAT_RATE * 100).toFixed(0)}%)`
                        : `Tax (${(VAT_RATE * 100).toFixed(0)}%)`}
                    </span>
                    <span>{formatAED(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "الإجمالي" : "Total"}</span>
                    <span className="font-semibold">{formatAED(totalAmount)}</span>
                  </div>
                  {booking.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {isAr ? "تاريخ الدفع" : "Paid At"}
                      </span>
                      <span>
                        {format(
                          new Date(booking.paidAt),
                          "MMM d, yyyy HH:mm",
                        )}
                      </span>
                    </div>
                  )}
                  {booking.payment?.stripePaymentIntentId && (
                    <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isAr ? "مرجع Stripe" : "Stripe Ref"}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {booking.payment.stripePaymentIntentId.slice(-12)}
                    </span>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Sidebar: Invoice */}
          <div className="space-y-5">
            {invoice ? (
              <div id="invoice" className="card p-5">
                <h2 className="font-semibold text-slate-900 mb-4">
                  🧾 {isAr ? "الفاتورة" : "Invoice"}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isAr ? "رقم الفاتورة" : "Invoice #"}
                    </span>
                    <span className="font-mono font-semibold text-xs">
                      {invoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isAr ? "المبلغ الأساسي" : "Subtotal"}
                    </span>
                    <span>{formatAED(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {isAr
                        ? `ضريبة (${(Number(invoice.taxRate) * 100).toFixed(0)}%)`
                        : `Tax (${(Number(invoice.taxRate) * 100).toFixed(0)}%)`}
                    </span>
                    <span>{formatAED(Number(invoice.taxAmount))}</span>
                  </div>
                  <hr className="border-slate-100 my-1" />
                  <div className="flex justify-between font-bold">
                    <span>{isAr ? "الإجمالي" : "Total"}</span>
                    <span className="text-primary-700">{formatAED(Number(invoice.totalAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "طريقة الدفع" : "Payment Method"}</span>
                    <span>{booking.paymentMethod === "CASH" ? "Cash on Delivery" : "Online (Stripe)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "حالة الدفع" : "Payment Status"}</span>
                    <span>
                      {booking.paymentStatus === "PAID"
                        ? "Paid"
                        : booking.paymentMethod === "CASH"
                          ? "Unpaid (Cash on Delivery)"
                          : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 text-center pt-1">
                    {isAr ? "صدرت في: " : "Issued: "}
                    {format(new Date(invoice.issuedAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            ) : booking.status === "CONFIRMED" ? (
              <div className="card p-5 text-center text-slate-400 text-sm">
                {isAr ? "جاري إنشاء الفاتورة..." : "Invoice generating..."}
              </div>
            ) : null}

            {/* Booking meta */}
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">
                {isAr ? "معلومات إضافية" : "Details"}
              </h3>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>{isAr ? "تاريخ الإنشاء" : "Created"}</span>
                  <span>
                    {format(new Date(booking.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{isAr ? "آخر تحديث" : "Updated"}</span>
                  <span>
                    {format(new Date(booking.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard`}
              className="btn-outline w-full justify-center text-sm"
            >
              {isAr ? "← العودة للحجوزات" : "← Back to Bookings"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
