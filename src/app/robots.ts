// src/app/robots.ts
// ─────────────────────────────────────────────────────────────────────────────
// Next.js App Router robots — automatically served at /robots.txt
// ─────────────────────────────────────────────────────────────────────────────

import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/admin", // Disallow all locale admin routes
          "/*/dashboard", // User dashboards (private)
          "/*/payment", // Payment flows (private)
          "/*/auth", // Auth pages (no SEO value)
          "/api/", // API routes
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
