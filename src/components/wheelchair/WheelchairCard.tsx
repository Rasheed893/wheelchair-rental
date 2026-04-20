// src/components/wheelchair/WheelchairCard.tsx
import Link from "next/link";
import Image from "next/image";
import type { WheelchairPublic } from "@/types";
import { formatAED } from "@/lib/currency";

interface Props {
  wheelchair: WheelchairPublic;
  locale: string;
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  STANDARD: { en: "Standard", ar: "عادي" },
  ELECTRIC: { en: "Electric", ar: "كهربائي" },
  PEDIATRIC: { en: "Pediatric", ar: "أطفال" },
  BARIATRIC: { en: "Bariatric", ar: "ثقيل الوزن" },
  TRANSPORT: { en: "Transport", ar: "نقل" },
};

export default function WheelchairCard({ wheelchair, locale }: Props) {
  const isAr = locale === "ar";
  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const description = isAr ? wheelchair.descriptionAr : wheelchair.description;
  const categoryLabel =
    CATEGORY_LABELS[wheelchair.category]?.[isAr ? "ar" : "en"] ??
    wheelchair.category;

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow duration-200 group animate-fade-in">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {wheelchair.images?.[0] ? (
          <Image
            src={wheelchair.images[0]}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl text-slate-300">
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

      {/* Content */}
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
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-slate-900">
              {formatAED(Number(wheelchair.pricePerDay))}
            </span>
            <span className="text-slate-400 text-sm">
              /{isAr ? "يوم" : "day"}
            </span>
          </div>
          <Link
            href={`/${locale}/wheelchairs/${wheelchair.id}`}
            className="btn-primary py-2 px-4 text-sm"
          >
            {isAr ? "احجز الآن" : "Book Now"}
          </Link>
        </div>
      </div>
    </div>
  );
}
