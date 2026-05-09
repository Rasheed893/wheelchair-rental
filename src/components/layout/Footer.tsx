// src/components/layout/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Footer({ locale }: { locale: string }) {
  const { user, loading } = useAuth();
  const companyName =
    process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "BioMobility";

  return (
    <footer className="mt-20 bg-slate-900 text-slate-400">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link
              href={`/${locale}`}
              className="mb-4 inline-flex items-center"
              aria-label={companyName}
            >
              <Image
                src="/branding/logo.svg"
                alt={companyName}
                width={220}
                height={55}
                className="h-auto w-[150px] object-contain sm:w-[160px] md:w-[190px]"
              />
            </Link>
            <p className="text-sm leading-relaxed">
              {locale === "ar"
                ? "\u062e\u062f\u0645\u0629 \u062a\u0623\u062c\u064a\u0631 \u0627\u0644\u0643\u0631\u0627\u0633\u064a \u0627\u0644\u0645\u062a\u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u0648\u062b\u0648\u0642\u0629 \u0644\u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a\u0643 \u0627\u0644\u064a\u0648\u0645\u064a\u0629."
                : "Reliable wheelchair rental service for your daily mobility needs."}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">
              {locale === "ar"
                ? "\u0631\u0648\u0627\u0628\u0637 \u0633\u0631\u064a\u0639\u0629"
                : "Quick Links"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${locale}/wheelchairs`}
                  className="transition-colors hover:text-white"
                >
                  {locale === "ar"
                    ? "\u062a\u0635\u0641\u062d \u0627\u0644\u0643\u0631\u0627\u0633\u064a"
                    : "Browse Wheelchairs"}
                </Link>
              </li>
              {loading ? null : user ? (
                <li>
                  <Link
                    href={`/${locale}/dashboard`}
                    className="transition-colors hover:text-white"
                  >
                    {locale === "ar"
                      ? "\u0637\u0644\u0628\u0627\u062a\u064a"
                      : "My Orders"}
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      href={`/${locale}/auth/login`}
                      className="transition-colors hover:text-white"
                    >
                      {locale === "ar"
                        ? "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644"
                        : "Login"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${locale}/auth/register`}
                      className="transition-colors hover:text-white"
                    >
                      {locale === "ar"
                        ? "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628"
                        : "Register"}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">
              {locale === "ar"
                ? "\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627"
                : "Contact"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</li>
              <li>{process.env.NEXT_PUBLIC_SUPPORT_PHONE}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs">
          {"\u00A9"} {new Date().getFullYear()} {companyName}.{" "}
          {locale === "ar"
            ? "\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629."
            : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
}
