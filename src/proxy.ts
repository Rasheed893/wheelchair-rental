// src/middleware.ts
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

// Routes that require authentication
const PROTECTED_PATTERNS = [
  /^\/[a-z]{2}\/dashboard/,
  /^\/[a-z]{2}\/admin/,
  /^\/[a-z]{2}\/wheelchairs\/[^/]+\/book/,
];

// Routes that require ADMIN role
const ADMIN_PATTERNS = [/^\/[a-z]{2}\/admin/];

// Routes only for guests (redirect logged-in users)
const GUEST_ONLY_PATTERNS = [
  /^\/[a-z]{2}\/auth\/login/,
  /^\/[a-z]{2}\/auth\/register/,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  // Determine locale for redirects
  const locale = pathname.split("/")[1] || defaultLocale;

  // Redirect logged-in users away from auth pages
  if (payload && GUEST_ONLY_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  // Protect authenticated routes
  if (PROTECTED_PATTERNS.some((p) => p.test(pathname))) {
    if (!payload) {
      const loginUrl = new URL(`/${locale}/auth/login`, req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin-only routes
    if (
      ADMIN_PATTERNS.some((p) => p.test(pathname)) &&
      payload.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  // Apply i18n middleware
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Match all pathnames except API routes, static files, etc.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
