"use client";

import { logger } from "@/lib/logger";
import { useEffect, useRef } from "react";

interface PaymentSuccessSyncProps {
  paymentIntentId?: string;
  bookingId?: string;
  onSyncComplete?: (paymentStatus: "PENDING" | "PAID" | "EXPIRED") => void;
  onSyncFailed?: () => void;
}

export function PaymentSuccessSync({
  paymentIntentId,
  bookingId,
  onSyncComplete,
  onSyncFailed,
}: PaymentSuccessSyncProps) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    if (!paymentIntentId) return;
    hasRunRef.current = true;

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
        });
        const data = await res.json();

        if (
          !res.ok ||
          data?.success !== true ||
          data?.data?.paymentStatus !== "PAID"
        ) {
          logger.error("[SUCCESS SYNC] Payment sync failed", { data });
          onSyncFailed?.();
          return;
        }

        logger.info("[SUCCESS SYNC] Payment sync completed", { data });
        onSyncComplete?.(data.data.paymentStatus);
      } catch (error) {
        logger.error("[SUCCESS SYNC] Request failed", { error });
        onSyncFailed?.();
      }
    })();
  }, [paymentIntentId, bookingId, onSyncComplete, onSyncFailed]);

  return null;
}
