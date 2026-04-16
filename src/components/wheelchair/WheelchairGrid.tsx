// src/components/wheelchair/WheelchairGrid.tsx
"use client";

import { useState } from "react";
import WheelchairCard from "./WheelchairCard";
import { useWheelchairs } from "@/hooks/useWheelchairs";
import { Spinner } from "@/components/ui/Spinner";
import type { WheelchairCategory } from "@prisma/client";

interface Props {
  locale: string;
  initialCategory?: WheelchairCategory;
}

const CATEGORIES: {
  value: WheelchairCategory | "ALL";
  en: string;
  ar: string;
}[] = [
  { value: "ALL", en: "All Types", ar: "الكل" },
  { value: "STANDARD", en: "Standard", ar: "عادي" },
  { value: "ELECTRIC", en: "Electric", ar: "كهربائي" },
  { value: "PEDIATRIC", en: "Pediatric", ar: "أطفال" },
  { value: "BARIATRIC", en: "Bariatric", ar: "ثقيل الوزن" },
  { value: "TRANSPORT", en: "Transport", ar: "نقل" },
];

export function WheelchairGrid({ locale, initialCategory }: Props) {
  const isAr = locale === "ar";
  const [category, setCategory] = useState<WheelchairCategory | undefined>(
    initialCategory,
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search
  let debounceTimer: ReturnType<typeof setTimeout>;
  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  }

  const { data, loading, error } = useWheelchairs({
    category,
    search: debouncedSearch || undefined,
    page,
    pageSize: 12,
  });

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategory(cat.value === "ALL" ? undefined : cat.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                category === cat.value || (!category && cat.value === "ALL")
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600"
              }`}
            >
              {isAr ? cat.ar : cat.en}
            </button>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={isAr ? "ابحث عن كرسي..." : "Search wheelchairs..."}
            className="input-field w-48 py-2"
          />
        </div>
      </div>

      {/* Results count */}
      {data && (
        <p className="text-sm text-slate-500 mb-6">
          {data.total} {isAr ? "كرسي متاح" : "wheelchairs available"}
          {debouncedSearch && (
            <span>
              {" "}
              {isAr ? "لـ" : "for"} "{debouncedSearch}"
            </span>
          )}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button
            onClick={() => setPage(1)}
            className="btn-outline mt-4 text-sm"
          >
            {isAr ? "حاول مجدداً" : "Try Again"}
          </button>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-lg font-medium text-slate-600 mb-1">
            {isAr ? "لا توجد نتائج" : "No wheelchairs found"}
          </p>
          <p className="text-sm mb-4">
            {isAr ? "جرب تغيير معايير البحث" : "Try adjusting your filters"}
          </p>
          <button
            onClick={() => {
              setCategory(undefined);
              setSearch("");
              setDebouncedSearch("");
            }}
            className="btn-outline text-sm"
          >
            {isAr ? "إعادة تعيين الفلاتر" : "Clear Filters"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.data.map((w) => (
            <WheelchairCard key={w.id} wheelchair={w} locale={locale} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline py-2 px-4 text-sm disabled:opacity-40"
          >
            {isAr ? "← السابق" : "← Prev"}
          </button>

          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium border transition-colors ${
                p === page
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="btn-outline py-2 px-4 text-sm disabled:opacity-40"
          >
            {isAr ? "التالي →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
