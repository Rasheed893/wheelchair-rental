// src/components/dashboard/RecentBookings.tsx
import { format } from "date-fns";
import Link from "next/link";
import type { BookingWithRelations } from "@/types";
import { formatAED } from "@/lib/currency";

interface Props {
  bookings: BookingWithRelations[];
  locale: string;
  showUser?: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-red",
  COMPLETED: "badge-blue",
  EXPIRED: "badge-gray",
};

export function RecentBookings({ bookings, locale, showUser = false }: Props) {
  const isAr = locale === "ar";

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        {isAr ? "لا توجد حجوزات حديثة" : "No recent bookings"}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {bookings.map((booking) => {
        const name = isAr ? booking.wheelchair.nameAr : booking.wheelchair.name;
        return (
          <div
            key={booking.id}
            className="flex items-center justify-between py-4 gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={STATUS_BADGE[booking.status]}>
                  {booking.status}
                </span>
              </div>
              <p className="font-medium text-slate-900 text-sm truncate">
                {name}
              </p>
              {showUser && (
                <p className="text-slate-400 text-xs">
                  {(booking as any).user?.name}
                </p>
              )}
              <p className="text-slate-400 text-xs">
                {format(new Date(booking.startDate), "MMM d")}
                {" → "}
                {format(new Date(booking.endDate), "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-slate-900 text-sm">
                {formatAED(Number(booking.totalPrice))}
              </p>
              <Link
                href={`/${locale}/dashboard/bookings/${booking.id}`}
                className="text-xs text-primary-600 hover:underline"
              >
                {isAr ? "عرض" : "View"}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
