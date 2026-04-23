// src/app/[locale]/wheelchairs/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAED } from "@/lib/currency";
import ImageGallery from "@/components/wheelchair/ImageGallery";

// interface Props {
//   params: { locale: string; id: string };
// }
interface Props {
  params: Promise<{ locale: string; id: string }>; // ✅ FIX
}

// async function getWheelchair(id: string) {
//   return prisma.wheelchair.findUnique({ where: { id } });
// }
async function getWheelchair(id: string) {
  if (!id) return null; // ✅ extra safety
  return prisma.wheelchair.findUnique({ where: { id } });
}

// export default async function WheelchairDetailPage({ params }: Props) {
//   const { locale, id } = params;
//   const isAr = locale === "ar";
//   const wheelchair = await getWheelchair(id);

//   if (!wheelchair || wheelchair.status === "RETIRED") notFound();
export default async function WheelchairDetailPage({ params }: Props) {
  const { locale, id } = await params; // ✅ CRITICAL FIX

  const isAr = locale === "ar";
  const wheelchair = await getWheelchair(id);

  if (!wheelchair || wheelchair.status === "RETIRED") {
    notFound();
  }

  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const description = isAr ? wheelchair.descriptionAr : wheelchair.description;
  const features = isAr ? wheelchair.featuresAr : wheelchair.features;

  const CATEGORY_LABELS: Record<string, string> = {
    STANDARD: isAr ? "عادي" : "Standard",
    ELECTRIC: isAr ? "كهربائي" : "Electric",
    PEDIATRIC: isAr ? "أطفال" : "Pediatric",
    BARIATRIC: isAr ? "ثقيل الوزن" : "Bariatric",
    TRANSPORT: isAr ? "نقل" : "Transport",
  };

  return (
    <div className="page-container py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <Link
          href={`/${locale}`}
          className="hover:text-primary-600 transition-colors"
        >
          {isAr ? "الرئيسية" : "Home"}
        </Link>
        <span>/</span>
        <Link
          href={`/${locale}/wheelchairs`}
          className="hover:text-primary-600 transition-colors"
        >
          {isAr ? "الكراسي" : "Wheelchairs"}
        </Link>
        <span>/</span>
        <span className="text-slate-600">{name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <ImageGallery images={wheelchair.images ?? []} name={name} />
        </div>
        {/* <div className="space-y-3">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
            {wheelchair.images?.[0] ? (
              <Image
                src={wheelchair.images[0]}
                alt={name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-8xl text-slate-200">
                ♿
              </div>
            )}
          </div>
          {wheelchair.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {wheelchair.images.slice(1, 5).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-slate-100"
                >
                  <Image
                    src={img}
                    alt={`${name} ${i + 2}`}
                    fill
                    sizes="(max-width: 1024px) 25vw, 12vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div> */}

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-blue">
              {CATEGORY_LABELS[wheelchair.category]}
            </span>
            {wheelchair.status === "AVAILABLE" ? (
              <span className="badge badge-green">
                {isAr ? "متاح" : "Available"}
              </span>
            ) : (
              <span className="badge badge-red">
                {isAr ? "غير متاح" : "Unavailable"}
              </span>
            )}
          </div>

          <h1
            className="text-3xl font-bold text-slate-900 mb-4"
            style={{ fontFamily: "var(--font-sora)" }}
          >
            {name}
          </h1>

          <p className="text-slate-600 leading-relaxed mb-6">{description}</p>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {wheelchair.weight && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">
                  {isAr ? "الوزن" : "Weight"}
                </div>
                <div className="font-semibold text-slate-900">
                  {wheelchair.weight} kg
                </div>
              </div>
            )}
            {wheelchair.maxLoad && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">
                  {isAr ? "الحمل الأقصى" : "Max Load"}
                </div>
                <div className="font-semibold text-slate-900">
                  {wheelchair.maxLoad} kg
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          {features?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">
                {isAr ? "المميزات" : "Features"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {features.map((f, i) => (
                  <span
                    key={i}
                    className="text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-full"
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price + CTA */}
          <div className="card p-5 mt-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-slate-900">
                {formatAED(Number(wheelchair.pricePerDay))}
              </span>
              <span className="text-slate-400">/ {isAr ? "يوم" : "day"}</span>
            </div>
            {wheelchair.status === "AVAILABLE" ? (
              <Link
                href={`/${locale}/wheelchairs/${wheelchair.id}/book`}
                className="btn-primary w-full justify-center text-base py-3"
              >
                {isAr ? "📅 احجز الآن" : "📅 Book This Wheelchair"}
              </Link>
            ) : (
              <button
                disabled
                className="btn-primary w-full justify-center opacity-50 cursor-not-allowed"
              >
                {isAr ? "غير متاح حالياً" : "Currently Unavailable"}
              </button>
            )}
            <p className="text-xs text-slate-400 text-center mt-3">
              {isAr
                ? "دفع آمن عبر Stripe. إلغاء مجاني."
                : "Secure payment via Stripe. Free cancellation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
