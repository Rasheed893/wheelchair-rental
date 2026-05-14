import { withSentryConfig } from "@sentry/nextjs";
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
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/@sparticuz/chromium/build/**/*",
    ],
  },

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

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/sitemap",
      },
      {
        source: "/sitemaps/:name.xml",
        destination: "/sitemaps/:name",
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "biomobility",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

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
