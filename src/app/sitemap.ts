// src/app/sitemap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Next.js App Router sitemap — automatically served at /sitemap.xml
// ─────────────────────────────────────────────────────────────────────────────

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { BASE_URL, LOCALES } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => [
    // Homepage
    {
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    // Wheelchair listing
    {
      url: `${BASE_URL}/${locale}/wheelchairs`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
  ]);

  // ── Dynamic wheelchair detail pages ─────────────────────────────────────────
  let wheelchairs: { id: string; updatedAt: Date }[] = [];
  try {
    wheelchairs = await prisma.wheelchair.findMany({
      where: { status: { not: "RETIRED" } },
      select: { id: true, updatedAt: true },
    });
  } catch (err) {
    console.error("[sitemap] Failed to fetch wheelchairs:", err);
  }

  const dynamicEntries: MetadataRoute.Sitemap = wheelchairs.flatMap((w) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/wheelchairs/${w.id}`,
      lastModified: w.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  return [...staticEntries, ...dynamicEntries];
}
