// src/components/layout/Footer.tsx
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Footer({ locale }: { locale: string }) {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-20">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div
              className="flex items-center gap-2 font-bold text-xl text-white mb-3"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              <span>♿</span>
              <span>WheelRent</span>
            </div>
            <p className="text-sm leading-relaxed">
              {locale === "ar"
                ? "خدمة تأجير الكراسي المتحركة الموثوقة لاحتياجاتك اليومية."
                : "Reliable wheelchair rental service for your daily mobility needs."}
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">
              {locale === "ar" ? "روابط سريعة" : "Quick Links"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${locale}/wheelchairs`}
                  className="hover:text-white transition-colors"
                >
                  {locale === "ar" ? "تصفح الكراسي" : "Browse Wheelchairs"}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/auth/login`}
                  className="hover:text-white transition-colors"
                >
                  {locale === "ar" ? "تسجيل الدخول" : "Login"}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/auth/register`}
                  className="hover:text-white transition-colors"
                >
                  {locale === "ar" ? "إنشاء حساب" : "Register"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">
              {locale === "ar" ? "تواصل معنا" : "Contact"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>support@wheelrent.com</li>
              <li>+1 (800) WHEEL-RENT</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-xs text-center">
          © {new Date().getFullYear()} WheelRent.{" "}
          {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
}
