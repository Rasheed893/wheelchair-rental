"use client";

import { use, useCallback, useEffect, useState } from "react";
import BookingCard from "@/components/booking/BookingCard";
import { useAuth } from "@/hooks/useAuth";
import type { BookingWithRelations } from "@/types";
import { formatAED } from "@/lib/currency";
import { calculateBookingPricing } from "@/lib/pricing";

export default function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "past">("all");
  const totalSpent = bookings
    .filter((booking) => booking.status === "CONFIRMED")
    .reduce(
      (sum, booking) =>
        sum +
        calculateBookingPricing(
          booking.totalDays,
          Number(booking.wheelchair.pricePerDay),
        ).totalAmount,
      0,
    );

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings?pageSize=50");
      const data = await res.json();
      if (data.success) setBookings(data.data.data);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchBookings();
    }
  }, [authLoading, user, fetchBookings]);

  async function handleCancel(bookingId: string) {
    if (
      !confirm(
        isAr
          ? "هل أنت متأكد من إلغاء الحجز؟"
          : "Are you sure you want to cancel?",
      )
    ) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      await fetchBookings();
    } finally {
      setCancellingId(null);
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === "active") {
      return ["PENDING", "CONFIRMED"].includes(booking.status);
    }

    if (activeTab === "past") {
      return ["CANCELLED", "COMPLETED", "EXPIRED"].includes(booking.status);
    }

    return true;
  });

  const tabs = [
    { key: "all", label: isAr ? "الكل" : "All", count: bookings.length },
    {
      key: "active",
      label: isAr ? "النشطة" : "Active",
      count: bookings.filter((booking) => ["PENDING", "CONFIRMED"].includes(booking.status)).length,
    },
    {
      key: "past",
      label: isAr ? "السابقة" : "Past",
      count: bookings.filter((booking) => ["CANCELLED", "COMPLETED", "EXPIRED"].includes(booking.status)).length,
    },
  ];

  if (authLoading) {
    return (
      <div className="page-container py-10 text-center text-slate-500">
        {isAr ? "جاري التحقق من الجلسة..." : "Verifying session..."}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-container py-10">
      <div className="mb-8">
        <h1 className="section-heading">
          {isAr ? `مرحباً، ${user.name}` : `Welcome back, ${user.name}`}
        </h1>
        <p className="mt-1 text-slate-500">
          {isAr ? "إدارة حجوزاتك وفواتيرك" : "Manage your bookings and invoices"}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: isAr ? "إجمالي الحجوزات" : "Total Bookings",
            value: bookings.length,
            color: "text-slate-900",
          },
          {
            label: isAr ? "حجوزات مؤكدة" : "Confirmed",
            value: bookings.filter((booking) => booking.status === "CONFIRMED").length,
            color: "text-emerald-600",
          },
          {
            label: isAr ? "في الانتظار" : "Pending Payment",
            value: bookings.filter((booking) => booking.status === "PENDING").length,
            color: "text-amber-600",
          },
          {
            label: isAr ? "إجمالي الإنفاق" : "Total Spent",
            value: formatAED(totalSpent),
            color: "text-primary-600",
          },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-xs text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex gap-2 border-b border-slate-100 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "all" | "active" | "past")}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeTab === tab.key
                  ? "bg-primary-100 text-primary-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loadingBookings ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="card animate-pulse p-5">
              <div className="mb-2 h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <span className="mb-4 block text-5xl">📅</span>
          <p className="mb-2 text-lg font-medium text-slate-600">
            {isAr ? "لا توجد حجوزات" : "No bookings yet"}
          </p>
          <a href={`/${locale}/wheelchairs`} className="btn-primary mt-4 inline-flex">
            {isAr ? "احجز الآن" : "Book a Wheelchair"}
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              locale={locale}
              onCancel={cancellingId ? undefined : handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
