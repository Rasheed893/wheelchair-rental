"use client";

import { logger } from "@/lib/logger";
import { useEffect, useRef } from "react";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

type BookingPaymentStatus = "PENDING" | "PAID" | "EXPIRED";

interface PaymentSuccessSyncProps {
  paymentIntentId?: string;
  bookingId?: string;
  bookingStatus?: BookingStatus | null;
  paymentStatus?: BookingPaymentStatus | null;
  syncReady?: boolean;
  onSyncComplete?: (result: {
    bookingStatus?: BookingStatus;
    paymentStatus?: BookingPaymentStatus;
    ignored?: boolean;
  }) => void;
  onSyncFailed?: () => void;
}

export function PaymentSuccessSync({
  paymentIntentId,
  bookingId,
  bookingStatus,
  paymentStatus,
  syncReady = true,
  onSyncComplete,
  onSyncFailed,
}: PaymentSuccessSyncProps) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    if (!syncReady) return;
    if (!paymentIntentId || !bookingId) return;

    if (bookingStatus === "CANCELLED" || bookingStatus === "EXPIRED") {
      hasRunRef.current = true;
      logger.info("[SUCCESS SYNC] Skipping payment sync for inactive booking", {
        bookingId,
        bookingStatus,
        paymentStatus,
      });
      return;
    }

    if (paymentStatus === "PAID") {
      hasRunRef.current = true;
      logger.info("[SUCCESS SYNC] Booking already marked as paid", {
        bookingId,
        paymentIntentId,
      });
      return;
    }

    hasRunRef.current = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          logger.info("[SUCCESS SYNC] Calling /api/payments/confirm", {
            paymentIntentId,
            bookingId,
          });

          const res = await fetch("/api/payments/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId, bookingId }),
            signal: controller.signal,
          });
          const data = await res.json();

          if (!res.ok || data?.success !== true) {
            logger.error("[SUCCESS SYNC] Payment sync failed", { data });
            onSyncFailed?.();
            return;
          }

          if (data?.data?.ignored) {
            logger.info("[SUCCESS SYNC] Payment sync ignored", {
              bookingId,
              paymentIntentId,
              reason: data?.data?.reason,
            });
            onSyncComplete?.(data.data);
            return;
          }

          if (data?.data?.paymentStatus !== "PAID") {
            logger.warn("[SUCCESS SYNC] Payment not marked as paid yet", {
              bookingId,
              paymentIntentId,
              data: data?.data,
            });
            onSyncFailed?.();
            return;
          }

          logger.info("[SUCCESS SYNC] Payment sync completed", { data });
          onSyncComplete?.(data.data);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            logger.info("[SUCCESS SYNC] Request aborted", {
              bookingId,
              paymentIntentId,
            });
            return;
          }

          logger.error("[SUCCESS SYNC] Request failed", { error });
          onSyncFailed?.();
        }
      })();
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    bookingId,
    bookingStatus,
    onSyncComplete,
    onSyncFailed,
    paymentIntentId,
    paymentStatus,
    syncReady,
  ]);

  return null;
}
