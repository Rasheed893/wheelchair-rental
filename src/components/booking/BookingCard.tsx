// src/components/booking/BookingCard.tsx
"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { BookingWithRelations } from "@/types";
import { formatAED } from "@/lib/currency";
import { calculateBookingPricing } from "@/lib/pricing";

interface Props {
  booking: BookingWithRelations;
  locale: string;
  onCancel?: (id: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-red",
  COMPLETED: "badge-blue",
  EXPIRED: "badge-gray",
};

const STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  PENDING: { en: "Pending Payment", ar: "بانتظار الدفع" },
  CONFIRMED: { en: "Confirmed", ar: "مؤكد" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
  COMPLETED: { en: "Completed", ar: "مكتمل" },
  EXPIRED: { en: "Expired", ar: "منتهي" },
};

export default function BookingCard({ booking, locale, onCancel }: Props) {
  const isAr = locale === "ar";
  const name = isAr ? booking.wheelchair.nameAr : booking.wheelchair.name;
  const reservationExpired =
    booking.paymentMethod === "ONLINE" &&
    booking.paymentStatus === "PENDING" &&
    !!booking.reservationExpiresAt &&
    new Date(booking.reservationExpiresAt) <= new Date();
  const statusLabel =
    STATUS_LABEL[booking.status]?.[isAr ? "ar" : "en"] ?? booking.status;
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);
  const { totalAmount } = calculateBookingPricing(
    booking.totalDays,
    Number(booking.wheelchair.pricePerDay),
  );
  const paymentStatusLabel =
    booking.paymentStatus === "PAID"
      ? isAr
        ? "🟢 مدفوع"
        : "🟢 Paid"
      : booking.paymentStatus === "EXPIRED" || reservationExpired
        ? isAr
          ? "منتهي"
          : "Expired"
        : booking.paymentMethod === "CASH"
          ? isAr
            ? "🟡 معلق (الدفع عند الاستلام)"
            : "🟡 Pending (Cash on Delivery)"
          : isAr
            ? "🟡 بانتظار الدفع"
            : "🟡 Pending";

  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={STATUS_BADGE[booking.status]}>{statusLabel}</span>
            {booking.invoice && (
              <span className="badge badge-blue">
                {isAr ? "فاتورة" : "Invoice"}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 text-base truncate">
            {name}
          </h3>

          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(booking.startDate), "MMM d, yyyy")}
            {" → "}
            {format(new Date(booking.endDate), "MMM d, yyyy")}
            {" · "}
            <span className="font-medium">
              {booking.totalDays}{" "}
              {isAr ? "يوم" : booking.totalDays === 1 ? "day" : "days"}
            </span>
          </p>

          <p className="text-slate-400 text-xs mt-1">
            {isAr ? "رقم الحجز:" : "Booking #"}
            {booking.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-slate-500 text-xs mt-1">{paymentStatusLabel}</p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-slate-900">
            {formatAED(totalAmount)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {isAr ? "إجمالي" : "total"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
        <Link
          href={`/${locale}/dashboard/bookings/${booking.id}`}
          className="btn-outline py-1.5 px-3 text-xs"
        >
          {isAr ? "التفاصيل" : "View Details"}
        </Link>

        {booking.status === "PENDING" &&
          booking.paymentMethod === "ONLINE" &&
          booking.paymentStatus === "PENDING" &&
          !reservationExpired && (
            <Link
              href={`/${locale}/wheelchairs/${booking.wheelchairId}/book?bookingId=${booking.id}`}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              {isAr ? "أكمل الدفع" : "`Complete Payment`"}
            </Link>
          )}

        {booking.invoice && (
          <Link
            href={`/${locale}/dashboard/bookings/${booking.id}#invoice`}
            className="btn-outline py-1.5 px-3 text-xs"
          >
            {isAr ? "عرض الفاتورة" : "View Invoice"}
          </Link>
        )}

        {canCancel && onCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            className="ms-auto text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
