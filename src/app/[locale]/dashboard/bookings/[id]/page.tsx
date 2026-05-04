"use client";

import { format } from "date-fns";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatAED } from "@/lib/currency";
import {
  formatDeliveryCity,
  formatDeliveryWindow,
} from "@/lib/delivery";
import { calculateBookingPricing } from "@/lib/pricing";
import type { BookingWithRelations } from "@/types";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

type BookingInvoice = {
  invoiceNumber: string;
  subtotal: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  issuedAt: string | Date;
  pdfUrl?: string | null;
  downloadUrl?: string;
  filename?: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-red",
  COMPLETED: "badge-blue",
  EXPIRED: "badge-gray",
  OUT_FOR_DELIVERY: "badge-blue",
  DELIVERED: "badge-blue",
};

const PAY_STATUS: Record<string, string> = {
  PENDING: "badge-yellow",
  PAID: "badge-green",
  EXPIRED: "badge-gray",
};

export default function BookingDetailPage({ params }: Props) {
  const { locale, id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingWithRelations | null>(null);
  const [invoice, setInvoice] = useState<BookingInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [supportPhone, setSupportPhone] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookings/${id}`).then((r) => r.json()),
      fetch(`/api/bookings/${id}/invoice`).then((r) => r.json()),
      fetch("/api/config/support-phone").then((r) => r.json()),
    ])
      .then(([bookingData, invoiceData, supportData]) => {
        if (bookingData.success) {
          setBooking(bookingData.data);
        }
        if (invoiceData.success) {
          setInvoice(invoiceData.data);
        }
        if (
          supportData.success &&
          typeof supportData.data?.supportPhone === "string"
        ) {
          setSupportPhone(supportData.data.supportPhone);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

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
      <div className="page-container mx-auto max-w-4xl py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-slate-100" />
          <div className="card space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-4 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-container py-16 text-center text-slate-400">
        <p>Booking not found</p>
        <Link
          href={`/${locale}/dashboard`}
          className="btn-primary mt-4 inline-flex"
        >
          Go Back
        </Link>
      </div>
    );
  }

  const reservationExpired =
    booking.paymentMethod === "ONLINE" &&
    booking.paymentStatus === "PENDING" &&
    !!booking.reservationExpiresAt &&
    new Date(booking.reservationExpiresAt) <= new Date();
  const isExpired =
    booking.paymentStatus === "EXPIRED" ||
    booking.status === "EXPIRED" ||
    reservationExpired;
  const isPending =
    booking.status === "PENDING" &&
    booking.paymentMethod === "ONLINE" &&
    booking.paymentStatus === "PENDING" &&
    !isExpired;
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);
  const pricing = calculateBookingPricing(
    booking.totalDays,
    Number(booking.wheelchair.pricePerDay),
    Number(booking.deliveryFee),
  );

  return (
    <div className="page-container py-10">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/${locale}/dashboard`} className="hover:text-primary-600">
            My Bookings
          </Link>
          <span>/</span>
          <span className="text-slate-600">
            #{booking.id.slice(-8).toUpperCase()}
          </span>
        </nav>

        {isPending && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Payment Pending
              </p>
              <p className="text-xs text-amber-700">
                Complete payment to confirm your booking.
              </p>
            </div>
            <Link
              href={`/${locale}/wheelchairs/${booking.wheelchairId}/book?bookingId=${booking.id}`}
              className="btn-primary shrink-0 px-4 py-2 text-sm"
            >
              Pay Now
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="card p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <span className={STATUS_BADGE[booking.status]}>
                    {booking.status}
                  </span>
                  <h1 className="mt-2 text-xl font-bold text-slate-900">
                    {locale === "ar"
                      ? booking.wheelchair.nameAr
                      : booking.wheelchair.name}
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="mb-1 text-xs text-slate-400">Start Date</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {format(new Date(booking.startDate), "EEEE, MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-400">End Date</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {format(new Date(booking.endDate), "EEEE, MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-400">Duration</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {booking.totalDays} {booking.totalDays === 1 ? "day" : "days"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-400">Daily Rate</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatAED(Number(booking.wheelchair.pricePerDay))}/day
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Delivery</p>
                <p className="mt-2">Phone: {booking.phoneNumber}</p>
                <p>City: {formatDeliveryCity(booking.deliveryCity)}</p>
                <p>Window: {formatDeliveryWindow(booking.deliveryWindow)}</p>
                <p className="whitespace-pre-line">{booking.deliveryAddress}</p>
                {booking.deliveryNotes ? (
                  <p className="mt-2">Notes: {booking.deliveryNotes}</p>
                ) : null}
              </div>

              {canCancel ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="btn-danger px-4 py-2 text-sm"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Booking"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="card p-6">
              <h2 className="mb-4 font-semibold text-slate-900">Payment Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Method</span>
                  <span>
                    {booking.paymentMethod === "CASH"
                      ? "Cash on Delivery"
                      : "Online (Stripe)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status</span>
                  <span className={PAY_STATUS[booking.paymentStatus]}>
                    {booking.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatAED(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Fee</span>
                  <span>{formatAED(pricing.deliveryFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT (5%)</span>
                  <span>{formatAED(pricing.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">Total</span>
                  <span>{formatAED(pricing.total)}</span>
                </div>
                {supportPhone ? (
                  <p className="pt-3 text-xs text-slate-500">
                    Support:{" "}
                    <a href={`tel:${supportPhone}`} className="underline">
                      {supportPhone}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {invoice ? (
              <div className="card p-5">
                <h2 className="mb-4 font-semibold text-slate-900">Invoice</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice #</span>
                    <span className="font-mono text-xs font-semibold">
                      {invoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span>{formatAED(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Fee</span>
                    <span>{formatAED(Number(booking.deliveryFee))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT (5%)</span>
                    <span>{formatAED(Number(invoice.taxAmount))}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary-700">
                      {formatAED(Number(invoice.totalAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery city</span>
                    <span>{formatDeliveryCity(booking.deliveryCity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery window</span>
                    <span>{formatDeliveryWindow(booking.deliveryWindow)}</span>
                  </div>
                  <p className="pt-1 text-center text-xs text-slate-400">
                    Issued: {format(new Date(invoice.issuedAt), "MMM d, yyyy")}
                  </p>
                  {invoice.pdfUrl ? (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline w-full justify-center text-sm"
                    >
                      Open PDF
                    </a>
                  ) : null}
                  {invoice.downloadUrl ? (
                    <a
                      href={invoice.downloadUrl}
                      download={invoice.filename}
                      className="btn-primary w-full justify-center text-sm"
                    >
                      Download Invoice
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Booking Details
              </h3>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{format(new Date(booking.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span>{format(new Date(booking.updatedAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>

            <Link href={`/${locale}/dashboard`} className="btn-outline w-full justify-center">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
