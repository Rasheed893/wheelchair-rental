import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  absoluteUrl,
  buildLocalizedPath,
  buildLocalizedUrl,
  buildWheelchairPath,
  locales,
  safeDate,
  type Locale,
} from "@/lib/seo";

type SitemapEntry = {
  path: string;
  locales?: Locale[];
  alternatePaths?: Partial<Record<Locale, string>>;
  lastModified?: Date;
  priority?: number;
  changeFrequency?: string;
};

type WheelchairSitemapEntry = {
  slug: string;
  updatedAt: Date;
};

const landingSitemapEntries: SitemapEntry[] = [
  {
    path: "/landing/wheelchair-rental-dubai",
    locales: ["en"],
    alternatePaths: { ar: "/landing/wheelchair-rental-uae" },
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: new Date(),
  },
  {
    path: "/landing/dubai-airport-wheelchair-rental",
    locales: ["en"],
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: new Date(),
  },
  {
    path: "/landing/post-surgery-wheelchair-rental",
    locales: ["en"],
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: new Date(),
  },
  {
    path: "/landing/wheelchair-rental-uae",
    locales: ["ar"],
    alternatePaths: { en: "/landing/wheelchair-rental-dubai" },
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: new Date(),
  },
];

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function toISODate(value: unknown): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value as string);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  return date > now ? now.toISOString() : date.toISOString();
}

const getCachedWheelchairSitemapEntries = unstable_cache(
  async (): Promise<WheelchairSitemapEntry[]> => {
    const wheelchairs = await prisma.wheelchair.findMany({
      where: {
        status: { not: "RETIRED" },
        slug: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return wheelchairs.map((wheelchair) => ({
      slug: wheelchair.slug!,
      updatedAt:
        safeDate(wheelchair.updatedAt) ??
        safeDate(wheelchair.createdAt) ??
        new Date(),
    }));
  },
  ["seo", "sitemap", "wheelchairs"],
  { revalidate: 3600, tags: ["wheelchairs", "seo"] },
);

export async function getWheelchairSitemapEntries() {
  return getCachedWheelchairSitemapEntries();
}

export function getPageSitemapEntries(): SitemapEntry[] {
  return [
    {
      path: "/",
      priority: 1.0,
      changeFrequency: "weekly",
      lastModified: new Date(),
    },
    {
      path: "/wheelchairs",
      priority: 0.9,
      changeFrequency: "daily",
      lastModified: new Date(),
    },
    ...landingSitemapEntries,
  ];
}

export async function getSitemapIndexEntries() {
  const entries: Array<{ url: string; lastModified?: Date }> = [
    {
      url: absoluteUrl("/sitemaps/pages.xml"),
    },
  ];

  const wheelchairs = await getWheelchairSitemapEntries();
  if (wheelchairs.length > 0) {
    entries.push({
      url: absoluteUrl("/sitemaps/wheelchairs.xml"),
      lastModified: wheelchairs[0]?.updatedAt ?? new Date(),
    });
  }

  return entries;
}

function renderAlternateLinks(
  basePath: string,
  entryLocales: readonly Locale[],
  alternatePaths?: Partial<Record<Locale, string>>,
) {
  const alternateMap = new Map<Locale, string>();

  entryLocales.forEach((locale) => alternateMap.set(locale, basePath));

  Object.entries(alternatePaths ?? {}).forEach(([locale, path]) => {
    if (path && locales.includes(locale as Locale)) {
      alternateMap.set(locale as Locale, path);
    }
  });

  const links = Array.from(alternateMap.entries())
    .map(([locale, path]) => {
      const href = buildLocalizedUrl(locale, path);
      const hreflang = locale === "ar" ? "ar-AE" : "en-AE";

      return `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`;
    })
    .join("");

  const xDefaultPath =
    alternateMap.get("en") ?? alternateMap.values().next().value ?? basePath;
  const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${buildLocalizedUrl("en", xDefaultPath)}" />`;

  return links + xDefault;
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const iso = toISODate(entry.lastModified);
      const lastmod = iso ? `<lastmod>${iso}</lastmod>` : "";
      const priority = entry.priority
        ? `<priority>${entry.priority.toFixed(1)}</priority>`
        : "";
      const changefreq = entry.changeFrequency
        ? `<changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const entryLocales = entry.locales ?? locales;

      return entryLocales
        .map((locale) => {
          const localizedPath = buildLocalizedPath(locale, entry.path);

          return `<url>
<loc>${absoluteUrl(localizedPath)}</loc>
${lastmod}
${changefreq}
${priority}
${renderAlternateLinks(entry.path, entryLocales, entry.alternatePaths)}
</url>`;
        })
        .join("");
    })
    .join("");

  return (
    XML_HEADER +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`
  );
}

export function renderWheelchairUrlSet(
  entries: WheelchairSitemapEntry[],
): string {
  const body = entries
    .map((entry) => {
      const basePath = buildWheelchairPath(entry.slug);

      const iso = toISODate(entry.updatedAt);
      const lastmod = iso ? `<lastmod>${iso}</lastmod>` : "";

      return locales
        .map((locale) => {
          const localizedPath = buildLocalizedPath(locale, basePath);

          return `<url>
<loc>${absoluteUrl(localizedPath)}</loc>
${lastmod}
<changefreq>weekly</changefreq>
<priority>0.8</priority>
${renderAlternateLinks(basePath, locales)}
</url>`;
        })
        .join("");
    })
    .join("");

  return (
    XML_HEADER +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`
  );
}

export function renderSitemapIndex(
  entries: Array<{ url: string; lastModified?: Date }>,
): string {
  const body = entries
    .map((entry) => {
      const iso = toISODate(entry.lastModified);
      const lastmod = iso ? `<lastmod>${iso}</lastmod>` : "";

      return `<sitemap>
<loc>${entry.url}</loc>
${lastmod}
</sitemap>`;
    })
    .join("");

  return (
    XML_HEADER +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`
  );
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=0, must-revalidate",
    },
  });
}
