// src/hooks/useWheelchairs.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { WheelchairPublic, PaginatedResponse } from "@/types";
import type { WheelchairCategory } from "@prisma/client";

interface UseWheelchairsOptions {
  category?: WheelchairCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useWheelchairs(options: UseWheelchairsOptions = {}) {
  const { category, search, page = 1, pageSize = 12 } = options;
  const [data, setData] = useState<PaginatedResponse<WheelchairPublic> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (category) params.set("category", category);
      if (search) params.set("search", search);

      const res = await fetch(`/api/wheelchairs?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch {
      setError("Failed to load wheelchairs");
    } finally {
      setLoading(false);
    }
  }, [category, search, page, pageSize]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useWheelchair(id: string) {
  const [wheelchair, setWheelchair] = useState<WheelchairPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/wheelchairs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setWheelchair(data.data);
        else setError(data.error);
      })
      .catch(() => setError("Failed to load wheelchair"))
      .finally(() => setLoading(false));
  }, [id]);

  return { wheelchair, loading, error };
}

export function useAvailability(wheelchairId: string) {
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wheelchairId) return;
    fetch(`/api/wheelchairs/${wheelchairId}/availability`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUnavailableDates(
            (data.data.unavailableDates ?? []).map((s: string) => new Date(s)),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [wheelchairId]);

  return { unavailableDates, loading };
}
