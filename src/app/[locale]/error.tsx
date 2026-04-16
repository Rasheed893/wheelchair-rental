// src/app/[locale]/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
  params,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  params?: { locale?: string };
}) {
  const locale = params?.locale ?? "en";
  const isAr = locale === "ar";

  useEffect(() => {
    console.error("[Page Error]", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1
          className="text-2xl font-bold text-slate-900 mb-3"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {isAr ? "حدث خطأ ما" : "Something Went Wrong"}
        </h1>
        <p className="text-slate-500 mb-2 text-sm leading-relaxed">
          {isAr
            ? "نعتذر عن هذا الخطأ. يمكنك المحاولة مجدداً أو العودة للصفحة الرئيسية."
            : "We're sorry for the inconvenience. You can try again or return to the home page."}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            {isAr ? "حاول مجدداً" : "Try Again"}
          </button>
          <Link href={`/${locale}`} className="btn-outline">
            {isAr ? "الرئيسية" : "Go Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
