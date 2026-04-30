// src/lib/seo.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central SEO helpers for WheelRent.
// All metadata generation flows through these functions so values stay
// consistent across locales, pages, and structured-data blocks.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SITE_NAME = "WheelRent";
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://wheelchair-rental.vercel.app";
export const SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ??
  process.env.NEXT_PUBLIC_ORDER_PHONE ??
  "";

export const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.jpg`; // place a 1200×630 image here
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Absolute URL for a locale-prefixed path. */
export function buildUrl(locale: Locale, path = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}/${locale}${clean}`;
}

/** hreflang alternates for a given path (without locale prefix). */
export function buildAlternates(
  path = "",
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: buildUrl("en", path),
    languages: {
      "en-AE": buildUrl("en", path),
      "ar-AE": buildUrl("ar", path),
    },
  };
}

// ── Base / root metadata ──────────────────────────────────────────────────────

/**
 * Merged into every locale layout.
 * Individual pages can override any field via generateMetadata().
 */
export function buildBaseMetadata(): Metadata {
  return {
    metadataBase: new URL(BASE_URL),
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: BASE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: "en_AE",
      alternateLocale: "ar_AE",
    },
    twitter: {
      card: "summary_large_image",
      site: "@WheelRentUAE", // update if you have a Twitter handle
    },
  };
}

// ── Homepage metadata ─────────────────────────────────────────────────────────

export function buildHomeMetadata(locale: Locale): Metadata {
  const isAr = locale === "ar";
  const path = "";

  const title = isAr
    ? "تأجير كراسي متحركة في الإمارات | WheelRent"
    : "Wheelchair Rental UAE, Dubai | Delivery & Pickup | WheelRent";

  const description = isAr
    ? "اكتشف أفضل خدمة تأجير كراسي متحركة في الإمارات. توصيل سريع، أسعار بالدرهم، وتشكيلة واسعة تشمل الكراسي العادية والكهربائية وكراسي الأطفال."
    : "Rent a wheelchair in UAE with fast delivery & pickup. Wide range of standard, electric, pediatric, and bariatric wheelchairs. AED pricing, free cancellation.";

  return {
    title,
    description,
    keywords: isAr
      ? ["تأجير كرسي متحرك", "كرسي متحرك الإمارات", "كرسي متحرك دبي"]
      : [
          "wheelchair rental UAE",
          "wheelchair rental Dubai",
          "portable wheelchair",
          "lightweight wheelchair",
          "hospital wheelchair",
          "electric wheelchair rental",
          "mobility aid rental",
        ],
    alternates: buildAlternates(path),
    openGraph: {
      title,
      description,
      url: buildUrl(locale, path),
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

// ── Listing page metadata ─────────────────────────────────────────────────────

export function buildListingMetadata(locale: Locale): Metadata {
  const isAr = locale === "ar";
  const path = "/wheelchairs";

  const title = isAr
    ? "تصفح الكراسي المتحركة | WheelRent الإمارات"
    : "Wheelchair Rental in UAE | Affordable Mobility | WheelRent";

  const description = isAr
    ? "اختر من بين مئات الكراسي المتحركة المتاحة للإيجار في الإمارات. كراسي عادية، كهربائية، للأطفال، وثقيلة الوزن — بأسعار يومية بالدرهم."
    : "Browse hundreds of wheelchairs available for rent across the UAE. Standard, electric, pediatric, bariatric & transport chairs. Affordable AED daily rates with home delivery.";

  return {
    title,
    description,
    keywords: isAr
      ? ["كراسي متحركة للإيجار", "كرسي كهربائي", "كرسي أطفال"]
      : [
          "wheelchair rental",
          "portable wheelchair UAE",
          "lightweight wheelchair",
          "hospital wheelchair rental",
          "bariatric wheelchair",
          "pediatric wheelchair",
          "electric wheelchair UAE",
          "mobility equipment rental",
        ],
    alternates: buildAlternates(path),
    openGraph: {
      title,
      description,
      url: buildUrl(locale, path),
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

// ── Product page metadata ─────────────────────────────────────────────────────

interface WheelchairSeoData {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  pricePerDay: number | string; // Prisma Decimal comes as string
  images: string[];
  category: string;
  status: string;
}

export function buildProductMetadata(
  wheelchair: WheelchairSeoData,
  locale: Locale,
): Metadata {
  const isAr = locale === "ar";
  const path = `/wheelchairs/${wheelchair.id}`;

  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const rawDesc = isAr ? wheelchair.descriptionAr : wheelchair.description;
  const price = Number(wheelchair.pricePerDay).toFixed(0);
  const ogImage = wheelchair.images?.[0] ?? DEFAULT_OG_IMAGE;

  const title = isAr
    ? `${name} – ${price} درهم/يوم | WheelRent`
    : `${name} – AED ${price}/day | WheelRent`;

  const description = isAr
    ? `استأجر ${name} بـ ${price} درهم يومياً. ${rawDesc ?? ""} توصيل سريع في الإمارات.`.trim()
    : `Rent the ${name} for AED ${price}/day. ${rawDesc ?? ""} Fast delivery across UAE.`.trim();

  return {
    title,
    description,
    alternates: {
      canonical: buildUrl(locale, path),
      languages: {
        "en-AE": buildUrl("en", path),
        "ar-AE": buildUrl("ar", path),
      },
    },
    openGraph: {
      title,
      description,
      url: buildUrl(locale, path),
      type: "website", // Next.js Metadata type; for rich results we use JSON-LD "Product"
      images: [
        {
          url: ogImage,
          width: 800,
          height: 600,
          alt: `${name} – wheelchair rental UAE`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
