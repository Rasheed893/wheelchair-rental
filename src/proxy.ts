// src/proxy.ts

import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/auth";
import { locales, defaultLocale } from "@/lib/i18n";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const PROTECTED_PATTERNS = [
  /^\/[a-z]{2}\/dashboard/,
  /^\/[a-z]{2}\/admin/,
  /^\/[a-z]{2}\/wheelchairs\/[^/]+\/book/,
];

const ADMIN_PATTERNS = [/^\/[a-z]{2}\/admin/];
const ADMIN_API_PATTERNS = [/^\/api\/admin(?:\/|$)/];

const GUEST_ONLY_PATTERNS = [
  /^\/[a-z]{2}\/auth\/login/,
  /^\/[a-z]{2}\/auth\/register/,
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (pathname === "/monitoring") {
    return NextResponse.next();
  }

  if (ADMIN_API_PATTERNS.some((pattern) => pattern.test(pathname))) {
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const locale = pathname.split("/")[1] || defaultLocale;

  if (payload && GUEST_ONLY_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  if (PROTECTED_PATTERNS.some((p) => p.test(pathname))) {
    if (!payload) {
      const loginUrl = new URL(`/${locale}/auth/login`, req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (
      ADMIN_PATTERNS.some((p) => p.test(pathname)) &&
      payload.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|monitoring|sitemaps|sitemap|sitemap\\.xml|robots\\.txt|.*\\..*).*)",
  ],
};
