import type { MetadataRoute } from "next";
import { absoluteUrl, BASE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/en/", "/ar/", "/en/wheelchairs", "/ar/wheelchairs"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/login/",
          "/register/",
          "/checkout/",
          "/payment-success/",
          "/preview/",
          "/en/admin/",
          "/ar/admin/",
          "/en/dashboard/",
          "/ar/dashboard/",
          "/en/auth/",
          "/ar/auth/",
          "/en/payment/",
          "/ar/payment/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: BASE_URL,
  };
}
