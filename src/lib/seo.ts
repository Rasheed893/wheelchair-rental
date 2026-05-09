import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";

export { defaultLocale, locales };
export type { Locale };

export const SITE_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "BioMobility";
export const SITE_SHORT_NAME = SITE_NAME;
export const SITE_DESCRIPTION =
  "Wheelchair rental across the UAE with fast delivery, pickup, and bilingual support.";
export const SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() ??
  process.env.NEXT_PUBLIC_ORDER_PHONE?.trim() ??
  "";

const rawBaseUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const BASE_URL = normalizeUrl(rawBaseUrl);
export const DEFAULT_OG_IMAGE = absoluteUrl("/og-default.jpg");
export const X_DEFAULT_LOCALE = defaultLocale;

const HREFLANG_MAP: Record<Locale, string> = {
  en: "en-AE",
  ar: "ar-AE",
};

export function normalizePathname(pathname = "/"): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized || "/";
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  const protocolMatch = trimmed.match(/^([a-z]+:)?\/\//i);
  if (!protocolMatch) {
    return trimmed.replace(/\/{2,}/g, "/");
  }

  const protocol = protocolMatch[0];
  const remainder = trimmed.slice(protocol.length).replace(/\/{2,}/g, "/");
  const normalized = `${protocol}${remainder}`;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function absoluteUrl(pathname = "/"): string {
  return normalizeUrl(`${BASE_URL}${normalizePathname(pathname)}`);
}

export function buildLocalizedPath(locale: Locale, pathname = "/"): string {
  const normalized = normalizePathname(pathname);
  return normalized === "/"
    ? normalizePathname(`/${locale}`)
    : normalizePathname(`/${locale}${normalized}`);
}

export function buildLocalizedUrl(locale: Locale, pathname = "/"): string {
  return absoluteUrl(buildLocalizedPath(locale, pathname));
}

export function buildWheelchairPath(slug: string): string {
  return normalizePathname(`/wheelchairs/${slug}`);
}

export function buildWheelchairBookingPath(slug: string): string {
  return normalizePathname(`/wheelchairs/${slug}/book`);
}

export function buildLocaleAlternates(pathname = "/") {
  const languages = Object.fromEntries(
    locales.map((locale) => [HREFLANG_MAP[locale], buildLocalizedUrl(locale, pathname)]),
  );

  return {
    canonical: buildLocalizedUrl(defaultLocale, pathname),
    languages: {
      ...languages,
      "x-default": buildLocalizedUrl(X_DEFAULT_LOCALE, pathname),
    },
  } satisfies NonNullable<Metadata["alternates"]>;
}

export function buildCanonicalAlternates(locale: Locale, pathname = "/") {
  const alternates = buildLocaleAlternates(pathname);

  return {
    ...alternates,
    canonical: buildLocalizedUrl(locale, pathname),
  } satisfies NonNullable<Metadata["alternates"]>;
}

export function buildIndexRobots(): NonNullable<Metadata["robots"]> {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function buildNoIndexRobots(): NonNullable<Metadata["robots"]> {
  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  };
}

export function safeDate(input?: Date | string | null): Date | undefined {
  if (!input) {
    return undefined;
  }

  const parsed = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const now = new Date();
  return parsed.getTime() > now.getTime() ? now : parsed;
}

interface SeoPageInput {
  locale: Locale;
  pathname?: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  robots?: NonNullable<Metadata["robots"]>;
  keywords?: string[];
  openGraphType?: "website" | "article";
}

export function buildSeoMetadata({
  locale,
  pathname = "/",
  title,
  description,
  image = DEFAULT_OG_IMAGE,
  imageAlt = title,
  robots = buildIndexRobots(),
  keywords,
  openGraphType = "website",
}: SeoPageInput): Metadata {
  const canonicalUrl = buildLocalizedUrl(locale, pathname);
  const alternates = buildCanonicalAlternates(locale, pathname);

  return {
    title,
    description,
    keywords,
    alternates,
    robots,
    openGraph: {
      type: openGraphType,
      siteName: SITE_NAME,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      alternateLocale: locale === "ar" ? ["en_AE"] : ["ar_AE"],
      url: canonicalUrl,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildBaseMetadata(): Metadata {
  return {
    metadataBase: new URL(BASE_URL),
    applicationName: SITE_NAME,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    authors: [{ name: SITE_NAME, url: BASE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "medical equipment rental",
    alternates: {
      canonical: buildLocalizedUrl(defaultLocale, "/"),
      languages: {
        "x-default": buildLocalizedUrl(defaultLocale, "/"),
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/branding/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/branding/icon-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/favicon-apple-touch-icon.png" }],
      shortcut: ["/favicon.ico"],
    },
    robots: buildIndexRobots(),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: BASE_URL,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
      locale: "en_AE",
      alternateLocale: ["ar_AE"],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function buildHomeMetadata(locale: Locale): Metadata {
  const isAr = locale === "ar";

  return buildSeoMetadata({
    locale,
    pathname: "/",
    title: isAr
      ? "تأجير كراسي متحركة في الإمارات مع التوصيل"
      : "Wheelchair Rental UAE with Fast Delivery",
    description: isAr
      ? "استأجر كرسياً متحركاً في دبي والإمارات مع توصيل سريع وخدمة باللغة العربية والإنجليزية وخيارات عادية وكهربائية وأطفال."
      : "Rent wheelchairs across Dubai and the UAE with fast delivery, pickup, Arabic and English support, and standard, electric, pediatric, and bariatric options.",
    keywords: isAr
      ? ["تأجير كرسي متحرك", "كرسي متحرك دبي", "تأجير كراسي متحركة الإمارات"]
      : ["wheelchair rental UAE", "wheelchair rental Dubai", "mobility aid rental"],
  });
}

export function buildListingMetadata(
  locale: Locale,
  options?: { noIndex?: boolean },
): Metadata {
  const isAr = locale === "ar";

  return buildSeoMetadata({
    locale,
    pathname: "/wheelchairs",
    title: isAr
      ? "تصفح الكراسي المتحركة للإيجار في الإمارات"
      : "Browse Wheelchairs for Rent in UAE",
    description: isAr
      ? "تصفح الكراسي المتحركة المتاحة للإيجار في الإمارات مع أسعار يومية وخيارات كهربائية وعادية وخدمة توصيل واستلام."
      : "Browse available wheelchairs for rent across the UAE with daily pricing, electric and standard models, and delivery and pickup support.",
    robots: options?.noIndex ? buildNoIndexRobots() : buildIndexRobots(),
    keywords: isAr
      ? ["كرسي متحرك للإيجار", "كرسي كهربائي", "تأجير معدات طبية"]
      : ["wheelchair rental", "electric wheelchair rental", "medical equipment rental"],
  });
}

interface WheelchairSeoData {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  pricePerDay: number | string;
  images: string[];
  category: string;
  status: string;
}

export function buildProductMetadata(
  wheelchair: WheelchairSeoData,
  locale: Locale,
): Metadata {
  const isAr = locale === "ar";
  const name = isAr ? wheelchair.nameAr : wheelchair.name;
  const description = isAr ? wheelchair.descriptionAr : wheelchair.description;
  const priceLabel = Number(wheelchair.pricePerDay).toFixed(0);
  const image = wheelchair.images[0] || DEFAULT_OG_IMAGE;

  return buildSeoMetadata({
    locale,
    pathname: buildWheelchairPath(wheelchair.slug),
    title: isAr
      ? `${name} للإيجار | ${priceLabel} درهم يومياً`
      : `${name} for Rent | AED ${priceLabel}/day`,
    description: isAr
      ? `${description} متاح للإيجار اليومي مع التوصيل في الإمارات.`
      : `${description} Available for daily rental with delivery across the UAE.`,
    image,
    imageAlt: name,
  });
}
