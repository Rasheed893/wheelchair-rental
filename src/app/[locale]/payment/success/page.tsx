// src/app/[locale]/payment/success/page.tsx
import Link from "next/link";

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { locale } = await params;
  const { bookingId } = await searchParams;
  const isAr = locale === "ar";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-fade-in">
          ✅
        </div>
        <h1
          className="text-2xl font-bold text-slate-900 mb-3"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {isAr ? "تم الدفع بنجاح!" : "Payment Successful!"}
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {isAr
            ? "تم تأكيد حجزك. ستصلك رسالة بريد إلكتروني تحتوي على تفاصيل الحجز والفاتورة."
            : "Your booking is confirmed. You'll receive a confirmation email with booking details and invoice."}
        </p>

        {bookingId && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-600">
            {isAr ? "رقم الحجز:" : "Booking ID:"}{" "}
            <span className="font-mono font-bold">
              {bookingId.slice(-8).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/${locale}/dashboard`} className="btn-primary py-3 px-6">
            {isAr ? "إدارة حجوزاتي" : "View My Bookings"}
          </Link>
          <Link
            href={`/${locale}/wheelchairs`}
            className="btn-outline py-3 px-6"
          >
            {isAr ? "حجز آخر" : "Book Another"}
          </Link>
        </div>
      </div>
    </div>
  );
}
