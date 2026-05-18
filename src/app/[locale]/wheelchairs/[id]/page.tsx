import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ImageGallery from "@/components/wheelchair/ImageGallery";
import { formatAED } from "@/lib/currency";
import {
  buildProductMetadata,
  buildWheelchairBookingPath,
  buildWheelchairPath,
  type Locale,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildWheelchairProductSchema,
  serializeJsonLd,
} from "@/lib/structured-data";
import { getPublicWheelchairByIdentifier } from "@/lib/wheelchair-public";

// export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = true;

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateStaticParams() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const wheelchairs = await prisma.wheelchair.findMany({
      where: { status: { not: "RETIRED" }, slug: { not: null } },
      select: { slug: true },
    });

    return wheelchairs.flatMap((wheelchair) => [
      { locale: "en", id: wheelchair.slug! },
      { locale: "ar", id: wheelchair.slug! },
    ]);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const wheelchair = await getPublicWheelchairByIdentifier(id);

  if (!wheelchair || wheelchair.status === "RETIRED") {
    return { title: "Not Found" };
  }

  if (wheelchair.slug && id === wheelchair.id) {
    permanentRedirect(`/${locale}${buildWheelchairPath(wheelchair.slug)}`);
  }

  const publicIdentifier = wheelchair.slug ?? wheelchair.id;

  return buildProductMetadata(
    {
      id: wheelchair.id,
      slug: publicIdentifier,
      name: wheelchair.name,
      nameAr: wheelchair.nameAr,
      description: wheelchair.description,
      descriptionAr: wheelchair.descriptionAr,
      pricePerDay: Number(wheelchair.pricePerDay),
      images: wheelchair.images ?? [],
      category: wheelchair.category,
      status: wheelchair.status,
    },
    locale as Locale,
  );
}

export default async function WheelchairDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const isAr = locale === "ar";
  const wheelchair = await getPublicWheelchairByIdentifier(id);

  if (!wheelchair || wheelchair.status === "RETIRED") {
    notFound();
  }

  if (wheelchair.slug && id === wheelchair.id) {
    permanentRedirect(`/${locale}${buildWheelchairPath(wheelchair.slug)}`);
  }

  const publicIdentifier = wheelchair.slug ?? wheelchair.id;
  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const description = isAr ? wheelchair.descriptionAr : wheelchair.description;
  const features = isAr ? wheelchair.featuresAr : wheelchair.features;

  const schemas = [
    buildWheelchairProductSchema({
      locale: locale as Locale,
      slug: publicIdentifier,
      name,
      description,
      imageUrls: wheelchair.images ?? [],
      pricePerDay: Number(wheelchair.pricePerDay),
      availability:
        wheelchair.status === "AVAILABLE"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    }),
    buildBreadcrumbSchema(locale as Locale, [
      { name: isAr ? "الرئيسية" : "Home", path: "/" },
      { name: isAr ? "الكراسي المتحركة" : "Wheelchairs", path: "/wheelchairs" },
      { name, path: buildWheelchairPath(publicIdentifier) },
    ]),
  ];

  const categoryLabels: Record<string, string> = {
    STANDARD: isAr ? "عادي" : "Standard",
    ELECTRIC: isAr ? "كهربائي" : "Electric",
    PEDIATRIC: isAr ? "أطفال" : "Pediatric",
    BARIATRIC: isAr ? "ثقيل الوزن" : "Bariatric",
    TRANSPORT: isAr ? "نقل" : "Transport",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas) }}
      />

      <div className="page-container py-10">
        <nav
          aria-label="breadcrumb"
          className="mb-8 flex items-center gap-2 text-sm text-slate-400"
        >
          <Link href={`/${locale}`} className="hover:text-primary-600">
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <span>/</span>
          <Link
            href={`/${locale}/wheelchairs`}
            className="hover:text-primary-600"
          >
            {isAr ? "الكراسي" : "Wheelchairs"}
          </Link>
          <span>/</span>
          <span className="text-slate-600">{name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ImageGallery images={wheelchair.images ?? []} name={name} />

          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="badge badge-blue">
                {categoryLabels[wheelchair.category]}
              </span>
              <span
                className={
                  wheelchair.status === "AVAILABLE"
                    ? "badge badge-green"
                    : "badge badge-red"
                }
              >
                {wheelchair.status === "AVAILABLE"
                  ? isAr
                    ? "متاح"
                    : "Available"
                  : isAr
                    ? "غير متاح"
                    : "Unavailable"}
              </span>
            </div>

            <h1
              className="mb-4 text-3xl font-bold text-slate-900"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              {name}
            </h1>

            <p className="mb-6 leading-relaxed text-slate-600">{description}</p>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {wheelchair.weight && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-1 text-xs text-slate-400">
                    {isAr ? "الوزن" : "Weight"}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {wheelchair.weight} kg
                  </div>
                </div>
              )}
              {wheelchair.maxLoad && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-1 text-xs text-slate-400">
                    {isAr ? "الحمل الأقصى" : "Max Load"}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {wheelchair.maxLoad} kg
                  </div>
                </div>
              )}
            </div>

            {features?.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  {isAr ? "المميزات" : "Features"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {features.map((feature, index) => (
                    <span
                      key={`${feature}-${index}`}
                      className="rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-700"
                    >
                      ✓ {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="card mt-6 p-5">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">
                  {formatAED(Number(wheelchair.pricePerDay))}
                </span>
                <span className="text-slate-400">/ {isAr ? "يوم" : "day"}</span>
              </div>

              <div className="mb-6 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                  🚚{" "}
                  {isAr
                    ? "السعر يشمل التوصيل والاستلام في عجمان والشارقة ودبي وأم القيوين"
                    : "Free delivery & pickup to AJM, SHJ, DXB, UAQ"}
                </span>
              </div>

              {wheelchair.status === "AVAILABLE" ? (
                <Link
                  href={`/${locale}${buildWheelchairBookingPath(publicIdentifier)}`}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  {isAr ? "📅 احجز الآن" : "📅 Book This Wheelchair"}
                </Link>
              ) : (
                <button
                  disabled
                  className="btn-primary w-full cursor-not-allowed justify-center opacity-50"
                >
                  {isAr ? "غير متاح حالياً" : "Currently Unavailable"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
