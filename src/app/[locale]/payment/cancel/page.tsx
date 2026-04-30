// src/app/[locale]/payment/cancel/page.tsx
import Link from "next/link";
import { use } from "react";

export default function PaymentCancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { locale } = use(params);
  const resolvedSearchParams = use(searchParams);
  const isAr = locale === "ar";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ❌
        </div>
        <h1
          className="text-2xl font-bold text-slate-900 mb-3"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {isAr ? "تم إلغاء الدفع" : "Payment Cancelled"}
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {isAr
            ? "لم يتم معالجة دفعتك. حجزك لا يزال محفوظاً لمدة 30 دقيقة."
            : "Your payment was not processed. Your booking is still reserved for 30 minutes."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {resolvedSearchParams.bookingId && (
            <Link
              href={`/${locale}/dashboard/bookings/${resolvedSearchParams.bookingId}`}
              className="btn-primary py-3 px-6"
            >
              {isAr ? "إكمال الدفع" : "Try Again"}
            </Link>
          )}
          <Link href={`/${locale}/dashboard`} className="btn-outline py-3 px-6">
            {isAr ? "لوحة التحكم" : "My Dashboard"}
          </Link>
        </div>
        {supportPhone && (
          <p className="mt-5 text-sm text-slate-500">
            {isAr ? "للمساعدة اتصل على " : "Need help? Call "}
            <a
              href={`tel:${supportPhone}`}
              className="font-semibold text-primary-700 underline"
            >
              {supportPhone}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
