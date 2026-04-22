// src/components/booking/BookingSummary.tsx
import { format, differenceInDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { WheelchairPublic } from "@/types";
import { formatAED } from "@/lib/currency";
import { VAT_RATE, calculateTax, calculateTotal } from "@/lib/pricing";

interface Props {
  wheelchair: WheelchairPublic;
  dateRange: DateRange | undefined;
  locale: string;
}

export function BookingSummary({ wheelchair, dateRange, locale }: Props) {
  const isAr = locale === "ar";

  const days =
    dateRange?.from && dateRange?.to
      ? Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1)
      : 0;

  const pricePerDay = Number(wheelchair.pricePerDay);
  const subtotal = days * pricePerDay;
  const taxAmount = calculateTax(subtotal, VAT_RATE);
  const total = calculateTotal(subtotal, VAT_RATE);
  const name = isAr ? wheelchair.nameAr : wheelchair.name;

  return (
    <div className="card p-5 sticky top-24">
      <h3 className="font-semibold text-slate-900 mb-4 text-sm">
        {isAr ? "ملخص الحجز" : "Booking Summary"}
      </h3>

      {/* Wheelchair */}
      <div className="bg-slate-50 rounded-xl p-3 mb-4">
        <p className="font-medium text-slate-900 text-sm leading-snug">
          {name}
        </p>
        <p className="text-slate-400 text-xs mt-0.5">
          {formatAED(pricePerDay)} / {isAr ? "يوم" : "day"}
        </p>
      </div>

      {/* Date range */}
      {dateRange?.from && dateRange?.to ? (
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{isAr ? "من" : "Check-in"}</span>
            <span className="font-medium">
              {format(dateRange.from, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{isAr ? "إلى" : "Check-out"}</span>
            <span className="font-medium">
              {format(dateRange.to, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              {isAr ? "المدة" : "Duration"}
            </span>
            <span className="font-medium">
              {days} {isAr ? "يوم" : days === 1 ? "day" : "days"}
            </span>
          </div>

          <hr className="border-slate-100 my-1" />

          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {days} × {formatAED(pricePerDay)}
            </span>
            <span>{formatAED(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {isAr
                ? `ضريبة (${(VAT_RATE * 100).toFixed(0)}%)`
                : `Tax (${(VAT_RATE * 100).toFixed(0)}%)`}
            </span>
            <span>{formatAED(taxAmount)}</span>
          </div>

          <hr className="border-slate-100 my-1" />

          <div className="flex justify-between font-bold text-base">
            <span>{isAr ? "الإجمالي" : "Total"}</span>
            <span className="text-primary-700">{formatAED(total)}</span>
          </div>
          <p className="text-xs text-slate-400 text-center pt-1">
            {isAr ? "شامل ضريبة القيمة المضافة" : "Inclusive of VAT"}
          </p>
        </div>
      ) : (
        <div className="py-6 text-center">
          <span className="text-3xl block mb-2">📅</span>
          <p className="text-slate-400 text-sm">
            {isAr ? "اختر التواريخ لرؤية السعر" : "Select dates to see pricing"}
          </p>
        </div>
      )}

      {/* Trust badges */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
        {[
          {
            icon: "🔒",
            text: isAr ? "دفع آمن عبر Stripe" : "Secure payment via Stripe",
          },
          {
            icon: "🔄",
            text: isAr ? "إلغاء مجاني قبل الموعد" : "Free cancellation",
          },
          { icon: "📞", text: isAr ? "دعم على مدار الساعة" : "24/7 support" },
        ].map((badge, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
