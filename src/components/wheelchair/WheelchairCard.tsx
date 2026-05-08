import Image from "next/image";
import Link from "next/link";
import type { WheelchairPublic } from "@/types";
import { formatAED } from "@/lib/currency";
import { buildWheelchairPath } from "@/lib/seo";

interface Props {
  wheelchair: WheelchairPublic;
  locale: string;
  priority?: boolean;
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  STANDARD: { en: "Standard", ar: "عادي" },
  ELECTRIC: { en: "Electric", ar: "كهربائي" },
  PEDIATRIC: { en: "Pediatric", ar: "أطفال" },
  BARIATRIC: { en: "Bariatric", ar: "ثقيل الوزن" },
  TRANSPORT: { en: "Transport", ar: "نقل" },
};

function buildAlt(name: string, category: string, locale: string): string {
  const isAr = locale === "ar";
  const categoryLabel =
    CATEGORY_LABELS[category]?.[isAr ? "ar" : "en"] ?? category;

  return isAr
    ? `${name} - تأجير كرسي متحرك ${categoryLabel} في الإمارات`
    : `${name} - ${categoryLabel} wheelchair rental UAE`;
}

export default function WheelchairCard({
  wheelchair,
  locale,
  priority = false,
}: Props) {
  const isAr = locale === "ar";
  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const description = isAr ? wheelchair.descriptionAr : wheelchair.description;
  const categoryLabel =
    CATEGORY_LABELS[wheelchair.category]?.[isAr ? "ar" : "en"] ??
    wheelchair.category;
  const publicPath = buildWheelchairPath(wheelchair.slug ?? wheelchair.id);

  return (
    <div className="group card animate-fade-in overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {wheelchair.images?.[0] ? (
          <Image
            src={wheelchair.images[0]}
            alt={buildAlt(name, wheelchair.category, locale)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 280px"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-5xl text-slate-300"
            aria-label={`${name} - no image available`}
            role="img"
          >
            ♿
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span className="badge bg-white/90 text-xs text-slate-700 shadow-sm backdrop-blur">
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3
          className="mb-1 line-clamp-1 text-base font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {name}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {description}
        </p>

        {wheelchair.features?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(isAr ? wheelchair.featuresAr : wheelchair.features)
              .slice(0, 3)
              .map((feature, index) => (
                <span
                  key={`${feature}-${index}`}
                  className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700"
                >
                  {feature}
                </span>
              ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                {formatAED(Number(wheelchair.pricePerDay))}
              </span>
              <span className="text-sm text-slate-400">
                /{isAr ? "يوم" : "day"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-emerald-600">
              🚚 {isAr ? "يشمل التوصيل" : "Incl. delivery"}
            </p>
          </div>

          <Link
            href={`/${locale}${publicPath}`}
            className="btn-primary px-4 py-2 text-sm"
            aria-label={
              isAr
                ? `احجز ${name} بسعر ${formatAED(Number(wheelchair.pricePerDay))} يومياً`
                : `Book ${name} for ${formatAED(Number(wheelchair.pricePerDay))}/day`
            }
          >
            {isAr ? "احجز الآن" : "Book Now"}
          </Link>
        </div>
      </div>
    </div>
  );
}
