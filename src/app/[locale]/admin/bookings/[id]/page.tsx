"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import type {
  BookingPaymentStatus,
  BookingStatus,
  DepositDeductionType,
  DepositStatus,
  PaymentMethod,
} from "@prisma/client";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { formatAED } from "@/lib/currency";

type DepositAuditLog = {
  id: string;
  action: string;
  oldStatus?: DepositStatus | null;
  newStatus?: DepositStatus | null;
  adminId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  deductionType?: DepositDeductionType | null;
  reason?: string | null;
  withheldAmount?: number | string | null;
  refundAmount?: number | string | null;
  createdAt: string | Date;
};

type AdminBookingDetail = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  totalPrice: number | string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: BookingPaymentStatus;
  phoneNumber: string;
  whatsappNumber?: string | null;
  idDocumentType?: string | null;
  idDocumentUploadedAt?: string | Date | null;
  deliveryCity: string;
  deliveryWindow: string;
  deliveryAddress: string;
  deliveryNotes?: string | null;
  securityDeposit: number | string;
  depositStatus: DepositStatus;
  depositCollectedAt?: string | Date | null;
  depositRefundedAt?: string | Date | null;
  depositDeductionType?: DepositDeductionType | null;
  depositDeductionReason?: string | null;
  depositWithheldAmount?: number | string | null;
  depositRefundAmount?: number | string | null;
  depositCollectedBy?: string | null;
  depositRefundedBy?: string | null;
  contractPdfUrl?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  wheelchair?: {
    name?: string | null;
    nameAr?: string | null;
  } | null;
  depositAuditLogs?: DepositAuditLog[];
};

const DEDUCTION_TYPES: DepositDeductionType[] = [
  "PHYSICAL_DAMAGE",
  "LOST_CHARGER",
  "MISSING_ACCESSORIES",
  "BATTERY_DAMAGE",
  "THEFT_OR_LOSS",
  "OTHER",
];

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || "-"}
      </dd>
    </div>
  );
}

export default function AdminBookingDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [handledBy, setHandledBy] = useState("");
  const [deductionType, setDeductionType] =
    useState<DepositDeductionType | "">("");
  const [withheldAmount, setWithheldAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!payload.success) {
      setError(payload.error ?? "Failed to load booking");
      setLoading(false);
      return;
    }

    setBooking(payload.data as AdminBookingDetail);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    // This page loads the selected booking whenever the route id changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBooking();
  }, [fetchBooking]);

  async function updateDeposit(action: string) {
    const isPartialWithholding = action === "deposit-partially-withheld";
    setBusy(action);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        handledBy,
        deductionType: isPartialWithholding ? deductionType : undefined,
        withheldAmount: isPartialWithholding ? withheldAmount : undefined,
        reason: isPartialWithholding ? deductionReason : undefined,
      }),
    });
    const payload = await response.json();

    if (!payload.success) {
      setError(payload.error ?? "Failed to update deposit");
      setBusy(null);
      return;
    }

    setMessage("Deposit status updated.");
    setBooking(payload.data as AdminBookingDetail);
    if (isPartialWithholding) {
      setDeductionType("");
      setWithheldAmount("");
      setDeductionReason("");
    }
    await fetchBooking();
    setBusy(null);
  }

  const canCollect = booking?.depositStatus === "PENDING";
  const canCloseDeposit = booking?.depositStatus === "COLLECTED";
  const securityDepositAmount = Number(booking?.securityDeposit ?? 0);
  const withheldAmountNumber = Number(withheldAmount);
  const hasWithheldAmount = withheldAmount.trim().length > 0;
  const hasValidWithheldAmount =
    hasWithheldAmount &&
    Number.isFinite(withheldAmountNumber) &&
    withheldAmountNumber > 0 &&
    withheldAmountNumber < securityDepositAmount;
  const calculatedRefundAmount = hasValidWithheldAmount
    ? securityDepositAmount - withheldAmountNumber
    : 0;
  const canPartiallyWithhold =
    Boolean(canCloseDeposit) &&
    Boolean(deductionType) &&
    hasValidWithheldAmount &&
    deductionReason.trim().length > 0;

  return (
    <div className="page-container py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <AdminSidebar locale={locale} />

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={`/${locale}/admin/bookings`}
                className="text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                Back to bookings
              </Link>
              <h1 className="section-heading mt-3">Booking detail</h1>
              <p className="mt-2 break-all text-sm text-slate-500">
                {bookingId}
              </p>
            </div>

            <a
              href={`/api/bookings/${bookingId}/rental-contract`}
              className="btn-primary w-full justify-center sm:w-auto"
            >
              Download rental contract
            </a>
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

          {loading && (
            <div className="card p-6 text-sm text-slate-500">
              Loading booking...
            </div>
          )}

          {!loading && booking && (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-6">
                <section className="card p-5">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Customer and compliance
                  </h2>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer" value={booking.user?.name} />
                    <Field label="Email" value={booking.user?.email} />
                    <Field label="Phone" value={booking.phoneNumber} />
                    <Field
                      label="Contact WhatsApp / phone"
                      value={booking.whatsappNumber ?? "Not provided"}
                    />
                    <Field
                      label="ID document type"
                      value={booking.idDocumentType ?? "Not selected"}
                    />
                    <Field
                      label="ID copy uploaded"
                      value={booking.idDocumentUploadedAt ? "Received" : "Missing"}
                    />
                  </dl>
                  {booking.idDocumentUploadedAt && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <a
                        href={`/api/admin/bookings/${booking.id}/id-document?disposition=view`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline w-full justify-center sm:w-auto"
                      >
                        View ID copy
                      </a>
                      <a
                        href={`/api/admin/bookings/${booking.id}/id-document?disposition=download`}
                        className="btn-outline w-full justify-center sm:w-auto"
                      >
                        Download ID copy
                      </a>
                    </div>
                  )}
                </section>

                <section className="card p-5">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Rental details
                  </h2>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Equipment" value={booking.wheelchair?.name} />
                    <Field label="Order status" value={booking.status} />
                    <Field
                      label="Rental dates"
                      value={`${format(new Date(booking.startDate), "MMM d, yyyy")} to ${format(new Date(booking.endDate), "MMM d, yyyy")}`}
                    />
                    <Field label="Rental total" value={formatAED(booking.totalPrice)} />
                    <Field label="Delivery city" value={booking.deliveryCity} />
                    <Field label="Delivery window" value={booking.deliveryWindow} />
                    <Field label="Delivery address" value={booking.deliveryAddress} />
                    <Field label="Delivery notes" value={booking.deliveryNotes} />
                  </dl>
                </section>

                <section className="card p-5">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Deposit audit log
                  </h2>
                  <div className="space-y-3">
                    {booking.depositAuditLogs?.length ? (
                      booking.depositAuditLogs.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-slate-100 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">
                              {entry.action}
                            </span>
                            <span className="text-xs text-slate-500">
                              {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.oldStatus ?? "-"} to {entry.newStatus ?? "-"}
                            {` by ${
                              entry.actorName ??
                              entry.actorEmail ??
                              entry.adminId ??
                              "unknown"
                            }`}
                          </p>
                          {entry.deductionType && (
                            <p className="mt-1 text-xs text-slate-500">
                              Deduction type: {entry.deductionType}
                            </p>
                          )}
                          {(entry.withheldAmount || entry.refundAmount) && (
                            <p className="mt-1 text-xs text-slate-500">
                              Withheld: {formatAED(entry.withheldAmount ?? 0)} /
                              Refund: {formatAED(entry.refundAmount ?? 0)}
                            </p>
                          )}
                          {entry.reason && (
                            <p className="mt-2 text-sm text-slate-700">
                              {entry.reason}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No deposit actions recorded yet.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <aside className="card h-fit p-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Deposit workflow
                </h2>
                <dl className="mt-4 space-y-4">
                  <Field
                    label="Deposit amount"
                    value={formatAED(booking.securityDeposit)}
                  />
                  <Field label="Deposit status" value={booking.depositStatus} />
                  <Field
                    label="Collected at"
                    value={
                      booking.depositCollectedAt
                        ? format(new Date(booking.depositCollectedAt), "MMM d, yyyy h:mm a")
                        : "-"
                    }
                  />
                  <Field
                    label="Refunded at"
                    value={
                      booking.depositRefundedAt
                        ? format(new Date(booking.depositRefundedAt), "MMM d, yyyy h:mm a")
                        : "-"
                    }
                  />
                  <Field
                    label="Deduction"
                    value={booking.depositDeductionType ?? "-"}
                  />
                  <Field
                    label="Withheld amount"
                    value={
                      booking.depositWithheldAmount
                        ? formatAED(booking.depositWithheldAmount)
                        : "-"
                    }
                  />
                  <Field
                    label="Customer refund amount"
                    value={
                      booking.depositRefundAmount
                        ? formatAED(booking.depositRefundAmount)
                        : "-"
                    }
                  />
                  <Field
                    label="Deduction reason"
                    value={booking.depositDeductionReason ?? "-"}
                  />
                </dl>

                <div className="mt-5 space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Admin or driver
                  </label>
                  <input
                    value={handledBy}
                    onChange={(event) => setHandledBy(event.target.value)}
                    placeholder="Name or staff ID"
                    className="input-field"
                  />

                  <button
                    type="button"
                    onClick={() => updateDeposit("deposit-collected")}
                    disabled={Boolean(busy) || !canCollect}
                    className="btn-outline w-full justify-center"
                  >
                    {busy === "deposit-collected" ? "Saving..." : "Mark collected"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateDeposit("deposit-refunded")}
                    disabled={Boolean(busy) || !canCloseDeposit}
                    className="btn-outline w-full justify-center"
                  >
                    {busy === "deposit-refunded" ? "Saving..." : "Mark refunded"}
                  </button>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Deduction type
                    </label>
                    <select
                      value={deductionType}
                      onChange={(event) =>
                        setDeductionType(
                          event.target.value as DepositDeductionType | "",
                        )
                      }
                      className="input-field"
                    >
                      <option value="">Select deduction type</option>
                      {DEDUCTION_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <label className="mb-1.5 mt-3 block text-sm font-medium text-slate-700">
                      Withheld amount
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      max={Math.max(securityDepositAmount - 0.01, 0)}
                      step="0.01"
                      value={withheldAmount}
                      onChange={(event) => setWithheldAmount(event.target.value)}
                      className="input-field"
                      placeholder="150.00"
                    />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Customer refund amount:{" "}
                      {hasValidWithheldAmount
                        ? formatAED(calculatedRefundAmount)
                        : formatAED(0)}
                    </p>
                    {hasWithheldAmount && !hasValidWithheldAmount && (
                      <p className="mt-1 text-xs text-red-600">
                        Withheld amount must be greater than AED 0 and less than
                        the security deposit.
                      </p>
                    )}

                    <label className="mb-1.5 mt-3 block text-sm font-medium text-slate-700">
                      Reason
                    </label>
                    <textarea
                      value={deductionReason}
                      onChange={(event) => setDeductionReason(event.target.value)}
                      className="input-field min-h-24"
                      placeholder="Describe damage, missing accessories, loss, or other reason"
                    />

                    <button
                      type="button"
                      onClick={() => updateDeposit("deposit-partially-withheld")}
                      disabled={Boolean(busy) || !canPartiallyWithhold}
                      className="btn-danger mt-3 w-full justify-center"
                    >
                      {busy === "deposit-partially-withheld"
                        ? "Saving..."
                        : "Mark partially withheld"}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
