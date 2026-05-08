import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WheelchairCard from "@/components/wheelchair/WheelchairCard";
import { buildHomeMetadata, type Locale } from "@/lib/seo";
import { backfillMissingWheelchairSlugs } from "@/lib/slug";
import {
  buildLocalBusinessSchema,
  buildWebsiteSchema,
  serializeJsonLd,
} from "@/lib/structured-data";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildHomeMetadata(locale as Locale);
}

async function getFeaturedWheelchairs() {
  try {
    await backfillMissingWheelchairSlugs();
    return await prisma.wheelchair.findMany({
      where: { status: "AVAILABLE" },
      take: 6,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[HOME] Failed to load featured wheelchairs", error);
    return [];
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const wheelchairs = await getFeaturedWheelchairs();
  const schemas = [
    buildWebsiteSchema(locale as Locale),
    buildLocalBusinessSchema(locale as Locale),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas) }}
      />

      <div>
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
            <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />
          </div>

          <div className="page-container relative py-24 text-center md:py-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <span>🌟</span>
              <span>
                {isAr
                  ? "الخدمة الأولى في المنطقة"
                  : "Trusted by 10,000+ customers"}
              </span>
            </div>

            <h1
              className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl"
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

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-primary-100 md:text-xl">
              {isAr
                ? "احجز كرسيك المتحرك بسرعة مع خيارات يومية وخدمة توصيل واستلام في دبي والإمارات."
                : "Book your wheelchair in minutes with daily rental options, fast delivery, and pickup across Dubai and the UAE."}
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`/${locale}/wheelchairs`}
                className="btn-primary bg-white px-8 py-3 text-base text-primary-700 hover:bg-primary-50"
              >
                {isAr ? "تصفح الكراسي" : "Browse Wheelchairs"}
              </Link>
              <Link
                href={`/${locale}/auth/register`}
                className="btn-outline border-white/40 px-8 py-3 text-base text-primary-700 hover:bg-white/10 hover:text-black"
              >
                {isAr ? "إنشاء حساب" : "Get Started Free"}
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white">
          <div className="page-container py-8">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              {[
                {
                  value: "500+",
                  label: isAr ? "كرسي متاح" : "Wheelchairs Available",
                },
                {
                  value: "10K+",
                  label: isAr ? "عميل سعيد" : "Happy Customers",
                },
                {
                  value: "24/7",
                  label: isAr ? "دعم متواصل" : "Customer Support",
                },
                {
                  value: "5★",
                  label: isAr ? "تقييم العملاء" : "Average Rating",
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="mb-1 text-3xl font-bold text-primary-600"
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

        <section className="page-container py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="section-heading">
              {isAr ? "أحدث الكراسي المتاحة" : "Featured Wheelchairs"}
            </h2>
            <Link
              href={`/${locale}/wheelchairs`}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {isAr ? "عرض الكل ←" : "View all →"}
            </Link>
          </div>

          {wheelchairs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="mb-4 block text-5xl">♿</span>
              <p>
                {isAr
                  ? "لا توجد كراسي متاحة حالياً"
                  : "No wheelchairs available yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {wheelchairs.map((wheelchair, index) => (
                <WheelchairCard
                  key={wheelchair.id}
                  wheelchair={wheelchair as any}
                  locale={locale}
                  priority={index < 3}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
