"use client";

import { useEffect, useRef } from "react";

interface PaymentSuccessSyncProps {
  paymentIntentId?: string;
  bookingId?: string;
  onSyncComplete?: () => void;
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
        console.log("[SUCCESS SYNC] Calling /api/payments/confirm", {
          paymentIntentId,
          bookingId,
        });

        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId, bookingId }),
        });
        const data = await res.json();

        if (!res.ok || !data?.success) {
          console.error("[SUCCESS SYNC] Payment sync failed", data);
          onSyncFailed?.();
          return;
        }

        console.log("[SUCCESS SYNC] Payment sync completed", data);
        onSyncComplete?.();
      } catch (error) {
        console.error("[SUCCESS SYNC] Request failed", error);
        onSyncFailed?.();
      }
    })();
  }, [paymentIntentId, bookingId, onSyncComplete, onSyncFailed]);

  return null;
}
