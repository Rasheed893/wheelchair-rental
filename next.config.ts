// next.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Task 7 & 8: Image optimization settings
//  • formats: serve AVIF then WebP (smaller files, faster loads)
//  • deviceSizes / imageSizes: match the sizes we declare in <Image sizes="">
//  • minimumCacheTTL: cache optimized images for 7 days on CDN edges
// ─────────────────────────────────────────────────────────────────────────────

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n.ts");

const nextConfig: NextConfig = {
  images: {
    // Task 7: serve modern formats automatically (AVIF ~50% smaller than JPEG)
    formats: ["image/avif", "image/webp"],

    // Match the breakpoints used in our <Image sizes=""> attributes.
    // Prevents Next.js from generating unnecessary intermediate sizes.
    deviceSizes: [640, 768, 1024, 1280, 1440, 1920],
    imageSizes: [150, 280, 450, 700, 900],

    // Cache optimized images for 7 days — reduces re-optimization on every hit
    minimumCacheTTL: 60 * 60 * 24 * 7,

    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Ensure Stripe webhook body is raw
  async headers() {
    return [
      {
        source: "/api/payments/webhook",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

// import type { NextConfig } from "next";
// import createNextIntlPlugin from "next-intl/plugin";

// const withNextIntl = createNextIntlPlugin("./src/lib/i18n.ts");

// const nextConfig: NextConfig = {
//   images: {
//     remotePatterns: [
//       { protocol: "https", hostname: "res.cloudinary.com" },
//       { protocol: "https", hostname: "images.unsplash.com" },
//     ],
//   },
//   // Ensure Stripe webhook body is raw
//   async headers() {
//     return [
//       {
//         source: "/api/payments/webhook",
//         headers: [{ key: "Content-Type", value: "application/json" }],
//       },
//     ];
//   },
// };

// export default withNextIntl(nextConfig);
