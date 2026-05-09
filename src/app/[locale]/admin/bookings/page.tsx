"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import type {
  BookingPaymentStatus,
  BookingStatus,
  PaymentMethod,
} from "@prisma/client";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { formatAED } from "@/lib/currency";

type AdminBooking = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  totalPrice: number | string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: BookingPaymentStatus;
  phoneNumber: string;
  whatsappNumber?: string | null;
  whatsappVerifiedAt?: string | Date | null;
  idDocumentType?: string | null;
  idDocumentUploadedAt?: string | Date | null;
  createdAt: string | Date;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  wheelchair?: {
    name?: string | null;
    nameAr?: string | null;
  } | null;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  OUT_FOR_DELIVERY: "badge-blue",
  DELIVERED: "badge-blue",
  CANCELLED: "badge-red",
  COMPLETED: "badge-green",
  EXPIRED: "badge-gray",
};

const ORDER_STATUSES: Array<BookingStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

const PAYMENT_STATUSES: Array<BookingPaymentStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "PAID",
];

const WHATSAPP_VERIFICATION_STATUSES = [
  "ALL",
  "VERIFIED",
  "NOT_VERIFIED",
] as const;

const NEXT_STATUS_OPTIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED"],
  CONFIRMED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function getPaymentLabel(booking: AdminBooking) {
  if (booking.paymentStatus === "PAID") {
    return "Paid";
  }

  if (booking.paymentMethod === "CASH") {
    return "Cash pending";
  }

  return "Pending";
}

function WhatsAppVerificationBadge({ booking }: { booking: AdminBooking }) {
  const verified = Boolean(booking.whatsappVerifiedAt);

  return (
    <span
      className={
        verified
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
      }
    >
      <span
        className={
          verified
            ? "h-2 w-2 rounded-full bg-emerald-500"
            : "h-2 w-2 rounded-full bg-amber-500"
        }
      />
      {verified ? "WhatsApp Verified" : "Not Verified"}
    </span>
  );
}

export default function AdminBookingsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [orderStatus, setOrderStatus] = useState<string>("ALL");
  const [paymentStatus, setPaymentStatus] = useState<string>("ALL");
  const [whatsappVerification, setWhatsappVerification] =
    useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<string, BookingStatus>
  >({});

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });

    if (orderStatus !== "ALL") {
      params.set("status", orderStatus);
    }
    if (paymentStatus !== "ALL") {
      params.set("paymentStatus", paymentStatus);
    }
    if (whatsappVerification !== "ALL") {
      params.set("whatsappVerification", whatsappVerification);
    }
    if (query.trim()) {
      params.set("query", query.trim());
    }

    const response = await fetch(`/api/admin/bookings?${params.toString()}`);
    const payload = await response.json();

    if (!payload.success) {
      setError(payload.error ?? "Failed to load bookings");
      setLoading(false);
      return;
    }

    const data = payload.data.data as AdminBooking[];
    setBookings(data);
    setTotalPages(payload.data.totalPages);
    setSelectedStatuses(
      Object.fromEntries(
        data.map((booking) => [
          booking.id,
          NEXT_STATUS_OPTIONS[booking.status]?.[0] ?? booking.status,
        ]),
      ),
    );
    setLoading(false);
  }, [orderStatus, page, paymentStatus, query, whatsappVerification]);

  useEffect(() => {
    // This page synchronizes filters/pagination to the latest API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBookings();
  }, [fetchBookings]);

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) {
      return;
    }

    setBusyAction(`cancel:${bookingId}`);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        reason: "Cancelled by admin",
      }),
    });
    const payload = await response.json();

    if (!payload.success) {
      setError(payload.error ?? "Failed to cancel booking");
      setBusyAction(null);
      return;
    }

    setMessage("Booking cancelled.");
    setBusyAction(null);
    await fetchBookings();
  }

  async function handleMarkPaid(bookingId: string) {
    if (!confirm("Mark this cash booking as paid?")) {
      return;
    }

    setBusyAction(`paid:${bookingId}`);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/payments/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const payload = await response.json();

    if (!payload.success) {
      setError(payload.error ?? "Failed to mark booking as paid");
      setBusyAction(null);
      return;
    }

    setMessage(payload.message ?? "Payment status updated.");
    setBusyAction(null);
    await fetchBookings();
  }

  async function handleStatusUpdate(bookingId: string) {
    const nextStatus = selectedStatuses[bookingId];
    if (!nextStatus) {
      return;
    }

    setBusyAction(`status:${bookingId}`);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-status",
        status: nextStatus,
      }),
    });
    const payload = await response.json();

    if (!payload.success) {
      setError(payload.error ?? "Failed to update booking status");
      setBusyAction(null);
      return;
    }

    setMessage(`Booking moved to ${nextStatus}.`);
    setBusyAction(null);
    await fetchBookings();
  }

  return (
    <div className="page-container py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <AdminSidebar locale={locale} />

        <div className="min-w-0 flex-1">
          <div className="mb-8">
            <h1 className="section-heading">Bookings</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage COD payments, delivery progress, cancellations, and booking
              search from one table.
            </p>
          </div>

          <div className="card mb-6 grid gap-4 p-5 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Search by booking ID or email
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="booking id or customer email"
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setQuery(searchInput);
                  }}
                  className="btn-outline w-full px-4 sm:w-auto"
                >
                  Search
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Order status
              </label>
              <select
                value={orderStatus}
                onChange={(event) => {
                  setPage(1);
                  setOrderStatus(event.target.value);
                }}
                className="input-field"
              >
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Payment status
              </label>
              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPage(1);
                  setPaymentStatus(event.target.value);
                }}
                className="input-field"
              >
                {PAYMENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                WhatsApp
              </label>
              <select
                value={whatsappVerification}
                onChange={(event) => {
                  setPage(1);
                  setWhatsappVerification(event.target.value);
                }}
                className="input-field"
              >
                {WHATSAPP_VERIFICATION_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value === "NOT_VERIFIED" ? "NOT VERIFIED" : value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {message && (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="space-y-4 p-4 lg:hidden">
              {loading
                ? Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="animate-pulse rounded-2xl border border-slate-100 p-4">
                      <div className="mb-3 h-4 w-1/2 rounded bg-slate-100" />
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-slate-100" />
                        <div className="h-3 w-3/4 rounded bg-slate-100" />
                        <div className="h-3 w-2/3 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))
                : bookings.map((booking) => {
                    const nextStatusOptions =
                      NEXT_STATUS_OPTIONS[booking.status] ?? [];
                    const isUpdatingStatus =
                      busyAction === `status:${booking.id}`;
                    const isMarkingPaid =
                      busyAction === `paid:${booking.id}`;
                    const isCancelling =
                      busyAction === `cancel:${booking.id}`;

                    return (
                      <div key={booking.id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-all font-mono text-xs text-slate-500">
                              #{booking.id.slice(-8).toUpperCase()}
                            </p>
                            <p className="mt-1 break-words font-medium text-slate-900">
                              {booking.user?.name ?? "Unknown"}
                            </p>
                            <p className="break-all text-xs text-slate-500">
                              {booking.user?.email ?? "No email"}
                            </p>
                            <p className="break-words text-xs text-slate-400">
                              {booking.phoneNumber}
                            </p>
                          </div>
                          <span className={STATUS_BADGE[booking.status]}>
                            {booking.status}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p className="break-words">
                            {booking.wheelchair?.name ?? "Unknown"}
                          </p>
                          <p>
                            {format(new Date(booking.startDate), "MMM d")} to{" "}
                            {format(new Date(booking.endDate), "MMM d, yyyy")}
                          </p>
                          <p className="font-semibold text-slate-900">
                            {formatAED(Number(booking.totalPrice))}
                          </p>
                          <p className="break-words">
                            {booking.paymentMethod} · {getPaymentLabel(booking)}
                          </p>
                          <div>
                            <WhatsAppVerificationBadge booking={booking} />
                          </div>
                          <p className="text-xs text-slate-500">
                            ID{" "}
                            {booking.idDocumentUploadedAt
                              ? `${booking.idDocumentType ?? "copy"} received`
                              : "missing"}
                          </p>
                          <p className="text-xs text-slate-400">
                            Created {format(new Date(booking.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                          {booking.paymentMethod === "CASH" &&
                            booking.paymentStatus !== "PAID" && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(booking.id)}
                                disabled={Boolean(busyAction)}
                                className="btn-outline w-full justify-center py-2 text-xs"
                              >
                                {isMarkingPaid ? "Marking..." : "Mark Paid"}
                              </button>
                            )}

                          {nextStatusOptions.length > 0 && (
                            <>
                              <select
                                value={
                                  selectedStatuses[booking.id] ??
                                  nextStatusOptions[0]
                                }
                                onChange={(event) =>
                                  setSelectedStatuses((current) => ({
                                    ...current,
                                    [booking.id]: event.target.value as BookingStatus,
                                  }))
                                }
                                className="input-field py-2 text-xs"
                                disabled={Boolean(busyAction)}
                              >
                                {nextStatusOptions.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(booking.id)}
                                disabled={Boolean(busyAction)}
                                className="btn-primary w-full py-2 text-xs"
                              >
                                {isUpdatingStatus ? "Saving..." : "Update Status"}
                              </button>
                            </>
                          )}

                          {["PENDING", "CONFIRMED"].includes(booking.status) && (
                            <button
                              type="button"
                              onClick={() => handleCancel(booking.id)}
                              disabled={Boolean(busyAction)}
                              className="btn-danger w-full justify-center py-2 text-xs"
                            >
                              {isCancelling ? "Cancelling..." : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

              {!loading && bookings.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  No bookings found.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Order status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading
                    ? Array.from({ length: 5 }, (_, index) => (
                        <tr key={index} className="animate-pulse">
                          {Array.from({ length: 9 }, (_, cell) => (
                            <td key={cell} className="px-4 py-4">
                              <div className="h-3 w-3/4 rounded bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : bookings.map((booking) => {
                        const nextStatusOptions =
                          NEXT_STATUS_OPTIONS[booking.status] ?? [];
                        const isUpdatingStatus =
                          busyAction === `status:${booking.id}`;
                        const isMarkingPaid =
                          busyAction === `paid:${booking.id}`;
                        const isCancelling =
                          busyAction === `cancel:${booking.id}`;

                        return (
                          <tr key={booking.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-4">
                              <div className="break-all font-mono text-xs text-slate-500">
                                #{booking.id.slice(-8).toUpperCase()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {booking.user?.name ?? "Unknown"}
                              </div>
                              <div className="break-all text-xs text-slate-500">
                                {booking.user?.email ?? "No email"}
                              </div>
                              <div className="break-words text-xs text-slate-400">
                                {booking.phoneNumber}
                              </div>
                              <div className="mt-2">
                                <WhatsAppVerificationBadge booking={booking} />
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                ID{" "}
                                {booking.idDocumentUploadedAt
                                  ? `${booking.idDocumentType ?? "copy"} received`
                                  : "missing"}
                              </div>
                            </td>
                            <td className="px-4 py-4 break-words text-slate-700">
                              {booking.wheelchair?.name ?? "Unknown"}
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                              {format(new Date(booking.startDate), "MMM d")} to{" "}
                              {format(new Date(booking.endDate), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {formatAED(Number(booking.totalPrice))}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {booking.paymentMethod}
                              </div>
                              <div className="text-xs text-slate-500">
                                {getPaymentLabel(booking)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={STATUS_BADGE[booking.status]}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                              {format(
                                new Date(booking.createdAt),
                                "MMM d, yyyy",
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[220px] flex-col gap-2">
                                {booking.paymentMethod === "CASH" &&
                                  booking.paymentStatus !== "PAID" && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkPaid(booking.id)}
                                      disabled={Boolean(busyAction)}
                                      className="btn-outline justify-center py-2 text-xs"
                                    >
                                      {isMarkingPaid
                                        ? "Marking..."
                                        : "Mark Paid"}
                                    </button>
                                  )}

                                {nextStatusOptions.length > 0 && (
                                  <div className="flex gap-2">
                                    <select
                                      value={
                                        selectedStatuses[booking.id] ??
                                        nextStatusOptions[0]
                                      }
                                      onChange={(event) =>
                                        setSelectedStatuses((current) => ({
                                          ...current,
                                          [booking.id]: event.target
                                            .value as BookingStatus,
                                        }))
                                      }
                                      className="input-field py-2 text-xs"
                                      disabled={Boolean(busyAction)}
                                    >
                                      {nextStatusOptions.map((value) => (
                                        <option key={value} value={value}>
                                          {value}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusUpdate(booking.id)
                                      }
                                      disabled={Boolean(busyAction)}
                                      className="btn-primary px-3 py-2 text-xs"
                                    >
                                      {isUpdatingStatus
                                        ? "Saving..."
                                        : "Update Status"}
                                    </button>
                                  </div>
                                )}

                                {["PENDING", "CONFIRMED"].includes(
                                  booking.status,
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancel(booking.id)}
                                    disabled={Boolean(busyAction)}
                                    className="btn-danger justify-center py-2 text-xs"
                                  >
                                    {isCancelling ? "Cancelling..." : "Cancel"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>

              {!loading && bookings.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  No bookings found.
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 p-4">
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((value) => (
                  <button
                    key={value}
                    onClick={() => setPage(value)}
                    className={
                      value === page
                        ? "flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-xs font-medium text-white"
                        : "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs font-medium text-slate-600"
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
