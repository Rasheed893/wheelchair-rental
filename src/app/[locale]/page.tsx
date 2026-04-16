// src/app/[locale]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WheelchairCard from "@/components/wheelchair/WheelchairCard";

interface Props {
  params: Promise<{ locale: string }>;
}

async function getFeaturedWheelchairs() {
  return prisma.wheelchair.findMany({
    where: { status: "AVAILABLE" },
    take: 6,
    orderBy: { createdAt: "desc" },
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const wheelchairs = await getFeaturedWheelchairs();

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full" />
        </div>

        <div className="page-container relative py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span>🌟</span>
            <span>
              {isAr
                ? "الخدمة الأولى في المنطقة"
                : "Trusted by 10,000+ customers"}
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-sora)" }}
          >
            {isAr ? (
              <>
                تأجير كراسي متحركة
                <br />
                <span className="text-primary-200">بكل سهولة ويسر</span>
              </>
            ) : (
              <>
                Wheelchair Rental
                <br />
                <span className="text-primary-200">Made Easy</span>
              </>
            )}
          </h1>

          <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "احجز كرسيك المتحرك بضغطة زر. تشكيلة واسعة، أسعار تنافسية، وتوصيل سريع."
              : "Book your wheelchair in minutes. Wide selection, competitive prices, and fast delivery."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/${locale}/wheelchairs`}
              className="btn-primary text-base px-8 py-3 bg-white text-primary-700 hover:bg-primary-50"
            >
              {isAr ? "تصفح الكراسي" : "Browse Wheelchairs"}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="btn-outline text-base px-8 py-3 border-white/40 text-primary-700 hover:bg-white/10 hover:text-black"
            >
              {isAr ? "إنشاء حساب" : "Get Started Free"}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────── */}
      <section className="bg-white border-b border-slate-100">
        <div className="page-container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              {
                value: "500+",
                label: isAr ? "كرسي متاح" : "Wheelchairs Available",
              },
              { value: "10K+", label: isAr ? "عميل سعيد" : "Happy Customers" },
              {
                value: "24/7",
                label: isAr ? "دعم متواصل" : "Customer Support",
              },
              { value: "5★", label: isAr ? "تقييم العملاء" : "Average Rating" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="text-3xl font-bold text-primary-600 mb-1"
                  style={{ fontFamily: "var(--font-sora)" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Wheelchairs ──────────────────────── */}
      <section className="page-container py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-heading">
            {isAr ? "أحدث الكراسي المتاحة" : "Featured Wheelchairs"}
          </h2>
          <Link
            href={`/${locale}/wheelchairs`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {isAr ? "عرض الكل ←" : "View all →"}
          </Link>
        </div>

        {wheelchairs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-5xl block mb-4">♿</span>
            <p>
              {isAr
                ? "لا توجد كراسي متاحة حالياً"
                : "No wheelchairs available yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wheelchairs.map((w) => (
              <WheelchairCard
                key={w.id}
                wheelchair={w as any}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="page-container">
          <h2 className="section-heading text-center mb-12">
            {isAr ? "كيف يعمل WheelRent؟" : "How WheelRent Works"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "🔍",
                title: isAr ? "اختر كرسيك" : "Choose Your Chair",
                desc: isAr
                  ? "تصفح مجموعتنا الواسعة واختر المناسب لاحتياجك"
                  : "Browse our wide selection and pick what fits your needs",
              },
              {
                step: "02",
                icon: "📅",
                title: isAr ? "احجز التواريخ" : "Select Your Dates",
                desc: isAr
                  ? "حدد تواريخ الحجز وتحقق من التوافر بشكل فوري"
                  : "Pick your rental dates and check availability instantly",
              },
              {
                step: "03",
                icon: "🚀",
                title: isAr ? "ادفع واستلم" : "Pay & Receive",
                desc: isAr
                  ? "ادفع بأمان عبر بطاقتك وانتظر التوصيل لباب منزلك"
                  : "Pay securely and get it delivered right to your door",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl text-3xl mb-4">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-primary-400 mb-1">
                  {item.step}
                </div>
                <h3
                  className="font-semibold text-slate-900 mb-2"
                  style={{ fontFamily: "var(--font-sora)" }}
                >
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
