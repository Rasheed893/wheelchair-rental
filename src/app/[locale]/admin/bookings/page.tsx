// src/app/[locale]/admin/bookings/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { format } from "date-fns";
import type { BookingWithRelations } from "@/types";
import type { BookingStatus } from "@prisma/client";

interface Props {
  params: { locale: string };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-red",
  COMPLETED: "badge-blue",
  EXPIRED: "badge-gray",
};

const STATUSES: (BookingStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
];

export default function AdminBookingsPage({ params }: Props) {
  const { locale } = params;
  const isAr = locale === "ar";
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status !== "ALL") params.set("status", status);
    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    if (data.success) {
      setBookings(data.data.data);
      setTotalPages(data.data.totalPages);
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function handleCancel(bookingId: string) {
    if (!confirm(isAr ? "إلغاء هذا الحجز؟" : "Cancel this booking?")) return;
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelled by admin" }),
    });
    fetchBookings();
  }

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0">
          <h1 className="section-heading mb-6">
            {isAr ? "إدارة الحجوزات" : "All Bookings"}
          </h1>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  status === s
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-start">
                      {isAr ? "الحجز" : "Booking"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isAr ? "المستخدم" : "User"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isAr ? "الكرسي" : "Wheelchair"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isAr ? "التواريخ" : "Dates"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isAr ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isAr ? "الحالة" : "Status"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isAr ? "إجراء" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading
                    ? [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {[...Array(7)].map((_, j) => (
                            <td key={j} className="px-4 py-4">
                              <div className="h-3 bg-slate-100 rounded w-3/4" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-4 font-mono text-xs text-slate-500">
                            #{b.id.slice(-8).toUpperCase()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900 text-xs">
                              {b.user?.name}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {b.user?.email}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600 text-xs">
                            {isAr ? b.wheelchair?.nameAr : b.wheelchair?.name}
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-xs">
                            {format(new Date(b.startDate), "MMM d")} →{" "}
                            {format(new Date(b.endDate), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            ${Number(b.totalPrice).toFixed(2)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={STATUS_BADGE[b.status]}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {["PENDING", "CONFIRMED"].includes(b.status) && (
                              <button
                                onClick={() => handleCancel(b.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                {isAr ? "إلغاء" : "Cancel"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>

              {!loading && bookings.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  {isAr ? "لا توجد حجوزات" : "No bookings found"}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        p === page
                          ? "bg-primary-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-primary-300"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
