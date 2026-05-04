// src/components/wheelchair/WheelchairCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Task 7 & 8 improvements:
//  • SEO-enriched alt text: "{name} – {category} wheelchair rental UAE"
//  • Explicit sizes attribute to prevent downloading oversized images
//  • priority prop supported for above-the-fold cards (e.g. first 3 on homepage)
//  • Component stays a server component — no "use client" needed here
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import Image from "next/image";
import type { WheelchairPublic } from "@/types";
import { formatAED } from "@/lib/currency";
import { Span } from "next/dist/trace";

interface Props {
  wheelchair: WheelchairPublic;
  locale: string;
  /**
   * Set to true for cards in the first visible row (above the fold).
   * Tells Next.js to preload the image, improving LCP on list pages.
   * Default: false (lazy load everything else).
   */
  priority?: boolean;
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  STANDARD: { en: "Standard", ar: "عادي" },
  ELECTRIC: { en: "Electric", ar: "كهربائي" },
  PEDIATRIC: { en: "Pediatric", ar: "أطفال" },
  BARIATRIC: { en: "Bariatric", ar: "ثقيل الوزن" },
  TRANSPORT: { en: "Transport", ar: "نقل" },
};

// ── SEO alt text ──────────────────────────────────────────────────────────────
// Encodes the product name + category + UAE keyword for image search signals.
function buildAlt(name: string, category: string, locale: string): string {
  const isAr = locale === "ar";
  const catLabel = CATEGORY_LABELS[category]?.[isAr ? "ar" : "en"] ?? category;
  return isAr
    ? `${name} – تأجير كرسي متحرك ${catLabel} في الإمارات`
    : `${name} – ${catLabel} wheelchair rental UAE`;
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

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow duration-200 group animate-fade-in">
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {wheelchair.images?.[0] ? (
          <Image
            src={wheelchair.images[0]}
            // Task 7: keyword-rich alt text
            alt={buildAlt(name, wheelchair.category, locale)}
            fill
            // Task 7: precise sizes prevent fetching a 1200px image for a 300px card
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 280px"
            // Task 8: priority=true only for above-the-fold cards, rest lazy-load
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="flex items-center justify-center h-full text-5xl text-slate-300"
            aria-label={`${name} – no image available`}
            role="img"
          >
            ♿
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="badge bg-white/90 backdrop-blur text-slate-700 text-xs shadow-sm">
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="p-5">
        <h3
          className="font-semibold text-slate-900 text-base mb-1 line-clamp-1"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          {name}
        </h3>
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Features */}
        {wheelchair.features?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(isAr ? wheelchair.featuresAr : wheelchair.features)
              .slice(0, 3)
              .map((f, i) => (
                <span
                  key={i}
                  className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full"
                >
                  {f}
                </span>
              ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                {formatAED(Number(wheelchair.pricePerDay))}
              </span>
              <span className="text-slate-400 text-sm">
                /{isAr ? "يوم" : "day"}
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-0.5">
              🚚 {isAr ? "يشمل التوصيل" : "Incl. delivery"}
            </p>
          </div>
          <Link
            href={`/${locale}/wheelchairs/${wheelchair.id}`}
            className="btn-primary py-2 px-4 text-sm"
            aria-label={
              isAr
                ? `احجز ${name} بـ ${formatAED(Number(wheelchair.pricePerDay))} يومياً`
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
