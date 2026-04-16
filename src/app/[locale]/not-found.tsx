// src/app/[locale]/not-found.tsx
import Link from "next/link";

export default function NotFoundPage({
  params,
}: {
  params?: { locale?: string };
}) {
  const locale = params?.locale ?? "en";
  const isAr = locale === "ar";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="text-center">
        <div
          className="text-8xl font-black text-slate-100 mb-4 select-none"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          404
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {isAr ? "الصفحة غير موجودة" : "Page Not Found"}
        </h1>
        <p className="text-slate-500 mb-8">
          {isAr
            ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <Link href={`/${locale}`} className="btn-primary">
          {isAr ? "← العودة للرئيسية" : "← Back to Home"}
        </Link>
      </div>
    </div>
  );
}
