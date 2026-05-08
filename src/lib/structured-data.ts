import { absoluteUrl, BASE_URL, buildLocalizedUrl, buildWheelchairPath, SITE_DESCRIPTION, SITE_NAME, SUPPORT_PHONE, type Locale } from "@/lib/seo";

type JsonLdValue = Record<string, unknown>;

export function serializeJsonLd(data: JsonLdValue | JsonLdValue[]): string {
  return JSON.stringify(data);
}

export function buildWebsiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: buildLocalizedUrl(locale, "/"),
    inLanguage: locale,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildLocalizedUrl(locale, "/wheelchairs")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildLocalBusinessSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "MedicalBusiness"],
    "@id": absoluteUrl("/#business"),
    name: SITE_NAME,
    url: buildLocalizedUrl(locale, "/"),
    image: absoluteUrl("/og-default.jpg"),
    logo: absoluteUrl("/logo.png"),
    description: SITE_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "United Arab Emirates",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
    },
    availableLanguage: ["en", "ar"],
    telephone: SUPPORT_PHONE || undefined,
    priceRange: "AED",
    currenciesAccepted: "AED",
  };
}

export function buildBreadcrumbSchema(
  locale: Locale,
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildLocalizedUrl(locale, item.path),
    })),
  };
}

interface ProductSchemaInput {
  locale: Locale;
  slug: string;
  name: string;
  description: string;
  imageUrls: string[];
  pricePerDay: number;
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
}

export function buildWheelchairProductSchema(input: ProductSchemaInput) {
  const url = buildLocalizedUrl(input.locale, buildWheelchairPath(input.slug));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.imageUrls.length ? input.imageUrls : [absoluteUrl("/og-default.jpg")],
    url,
    category: "Wheelchair Rental",
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      price: input.pricePerDay.toFixed(2),
      priceCurrency: "AED",
      availability: input.availability,
      url,
      itemCondition: "https://schema.org/UsedCondition",
      seller: {
        "@type": ["LocalBusiness", "MedicalBusiness"],
        name: SITE_NAME,
        url: BASE_URL,
      },
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
    },
  };
}
