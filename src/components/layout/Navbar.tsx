// src/components/layout/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface NavbarProps {
  locale: string;
}

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isRTL = locale === "ar";
  const otherLocale = locale === "en" ? "ar" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);
  const logoAlt =
    process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "BioMobility";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await logout(locale);
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={`/${locale}${href}`}
      className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
    >
      {label}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100"
          : "bg-white border-b border-slate-100"
      }`}
    >
      <div className="page-container">
        <nav className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              href={`/${locale}`}
              className="flex items-center"
              aria-label={logoAlt}
            >
              <Image
                src="/branding/logo.svg"
                alt={logoAlt}
                width={220}
                height={55}
                className="h-auto w-[150px] object-contain sm:w-[160px] md:w-[190px] lg:w-[210px]"
                priority
                fetchPriority="high"
              />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div
            className={`hidden md:flex items-center gap-8 ${
              isRTL ? "mr-auto ml-8" : "ml-auto mr-8"
            }`}
          >
            {navLink("/wheelchairs", t("browse"))}
            {user && navLink("/dashboard", t("myBookings"))}
            {user?.role === "ADMIN" && navLink("/admin", t("admin"))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Locale switcher */}
            <Link
              href={otherLocalePath}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {otherLocale === "ar" ? "العربية" : "English"}
            </Link>

            {loading ? (
              <div className="text-sm text-slate-500">&nbsp;</div>
            ) : user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs">
                    {user.name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                  <span>{user.name?.split(" ")[0] ?? "User"}</span>
                </button>
                {/* Dropdown */}
                <div
                  className={`absolute top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg opacity-0 invisible transition-all duration-150 group-hover:opacity-100 group-hover:visible ${
                    isRTL ? "left-0" : "right-0"
                  }`}
                >
                  <Link
                    href={`/${locale}/dashboard`}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t("dashboard")}
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      href={`/${locale}/admin`}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {t("adminPanel")}
                    </Link>
                  )}
                  <hr className="my-1 border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    {t("logout")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href={`/${locale}/auth/login`}
                  className="btn-outline py-2 px-4 text-sm"
                >
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="btn-primary py-2 px-4 text-sm"
                >
                  {t("register")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-slate-700 mb-1 transition-all" />
            <div className="w-5 h-0.5 bg-slate-700 mb-1" />
            <div className="w-5 h-0.5 bg-slate-700" />
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-slate-100 pt-4 space-y-2">
            <Link
              href={`/${locale}/wheelchairs`}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              {t("browse")}
            </Link>
            {user && (
              <Link
                href={`/${locale}/dashboard`}
                className="block py-2 text-sm font-medium text-slate-700"
              >
                {t("myBookings")}
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href={`/${locale}/admin`}
                className="block py-2 text-sm font-medium text-slate-700"
              >
                {t("admin")}
              </Link>
            )}
            <Link
              href={otherLocalePath}
              className="block py-2 text-sm font-medium text-primary-600"
            >
              {otherLocale === "ar" ? "العربية" : "English"}
            </Link>
            {loading ? (
              <div className="block py-2 text-sm text-slate-500">&nbsp;</div>
            ) : user ? (
              <button
                onClick={handleLogout}
                className="block py-2 text-sm font-medium text-red-600"
              >
                {t("logout")}
              </button>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link
                  href={`/${locale}/auth/login`}
                  className="btn-outline flex-1 text-center py-2"
                >
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="btn-primary flex-1 text-center py-2"
                >
                  {t("register")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
