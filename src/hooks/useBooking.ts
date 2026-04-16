// src/hooks/useBooking.ts
"use client";

import { useState, useCallback } from "react";
import type { BookingWithRelations, BookingCreateInput } from "@/types";

export function useBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = useCallback(
    async (input: BookingCreateInput): Promise<BookingWithRelations | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
          return null;
        }
        return data.data;
      } catch {
        setError("Failed to create booking");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const cancelBooking = useCallback(
    async (bookingId: string, reason?: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
          return false;
        }
        return true;
      } catch {
        setError("Failed to cancel booking");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createPaymentIntent = useCallback(
    async (
      bookingId: string,
    ): Promise<{ clientSecret: string; paymentIntentId: string } | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
          return null;
        }
        return data.data;
      } catch {
        setError("Failed to initialize payment");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, createBooking, cancelBooking, createPaymentIntent };
}
