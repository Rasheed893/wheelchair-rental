import { differenceInDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { formatAED } from "@/lib/currency";
import type { DeliveryCity } from "@/lib/delivery";
import { getDeliveryFee } from "@/lib/delivery";
import { calculateBookingPricing } from "@/lib/pricing";
import type { WheelchairPublic } from "@/types";

interface Props {
  wheelchair: WheelchairPublic;
  dateRange: DateRange | undefined;
  deliveryCity?: DeliveryCity;
  locale: string;
}

export function BookingSummary({
  wheelchair,
  dateRange,
  deliveryCity,
  locale,
}: Props) {
  const isAr = locale === "ar";
  const days =
    dateRange?.from && dateRange?.to
      ? Math.max(1, differenceInDays(dateRange.to, dateRange.from))
      : 0;
  const pricePerDay = Number(wheelchair.pricePerDay);
  const pricing = calculateBookingPricing(
    days,
    pricePerDay,
    deliveryCity ? getDeliveryFee(deliveryCity) : 0,
  );
  const name = isAr ? wheelchair.nameAr : wheelchair.name;

  return (
    <div className="card sticky top-24 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">
        {isAr ? "Booking Summary" : "Booking Summary"}
      </h3>

      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-medium leading-snug text-slate-900">{name}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatAED(pricePerDay)} / {isAr ? "day" : "day"}
        </p>
      </div>

      {dateRange?.from && dateRange?.to ? (
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{isAr ? "Check-in" : "Check-in"}</span>
            <span className="font-medium">
              {format(dateRange.from, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              {isAr ? "Check-out" : "Check-out"}
            </span>
            <span className="font-medium">
              {format(dateRange.to, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{isAr ? "Duration" : "Duration"}</span>
            <span className="font-medium">
              {days} {days === 1 ? "day" : "days"}
            </span>
          </div>

          <hr className="my-1 border-slate-100" />

          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {days} x {formatAED(pricePerDay)}
            </span>
            <span>{formatAED(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{isAr ? "Delivery Fee" : "Delivery Fee"}</span>
            <span>{formatAED(pricing.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{isAr ? "VAT (5%)" : "VAT (5%)"}</span>
            <span>{formatAED(pricing.tax)}</span>
          </div>

          <hr className="my-1 border-slate-100" />

          <div className="flex justify-between text-base font-bold">
            <span>{isAr ? "Total" : "Total"}</span>
            <span className="text-primary-700">{formatAED(pricing.total)}</span>
          </div>
          <p className="pt-1 text-center text-xs text-slate-400">
            {isAr ? "Inclusive of VAT" : "Inclusive of VAT"}
          </p>
        </div>
      ) : (
        <div className="py-6 text-center">
          <span className="mb-2 block text-3xl">...</span>
          <p className="text-sm text-slate-400">
            {isAr ? "Select dates to see pricing" : "Select dates to see pricing"}
          </p>
        </div>
      )}
    </div>
  );
}
