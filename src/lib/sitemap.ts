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
import { backfillMissingWheelchairSlugs } from "@/lib/slug";

type SitemapEntry = {
  path: string;
  lastModified?: Date;
  priority?: number;
  changeFrequency?: string;
};

type WheelchairSitemapEntry = {
  slug: string;
  updatedAt: Date;
};

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
    await backfillMissingWheelchairSlugs();

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

/**
 * FIXED: Accepts base (non-localized) path
 */
function renderAlternateLinks(basePath: string) {
  return locales
    .map((locale) => {
      const href = buildLocalizedUrl(locale, basePath);
      const hreflang = locale === "ar" ? "ar-AE" : "en-AE";

      return `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`;
    })
    .concat(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${buildLocalizedUrl("en", basePath)}" />`,
    )
    .join("");
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

      return locales
        .map((locale) => {
          const localizedPath = buildLocalizedPath(locale, entry.path);

          return `<url>
<loc>${absoluteUrl(localizedPath)}</loc>
${lastmod}
${changefreq}
${priority}
${renderAlternateLinks(entry.path)}
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
${renderAlternateLinks(basePath)}
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
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
