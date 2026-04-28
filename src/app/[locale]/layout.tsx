// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { getOptionalEnv } from "@/lib/env";
import { locales } from "@/lib/i18n";
import { buildBaseMetadata, SITE_NAME } from "@/lib/seo";

// ── Base metadata (inherited by all child pages) ──────────────────────────────
// Individual pages call generateMetadata() to OVERRIDE specific fields.
// Next.js does a shallow merge: child values win, unset fields fall back here.
export const metadata: Metadata = {
  ...buildBaseMetadata(),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: SITE_NAME,
  },
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages({ locale });
  const isRTL = locale === "ar";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div
        className={`flex min-h-screen flex-col ${isRTL ? "font-arabic" : ""}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Navbar locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
        <WhatsAppButton number={getOptionalEnv("ORDER_PHONE")} />
      </div>
    </NextIntlClientProvider>
  );
}

// import type { Metadata } from "next";
// import { NextIntlClientProvider } from "next-intl";
// import { getMessages } from "next-intl/server";
// import { notFound } from "next/navigation";
// import Footer from "@/components/layout/Footer";
// import Navbar from "@/components/layout/Navbar";
// import { locales } from "@/lib/i18n";
// import WhatsAppButton from "@/components/layout/WhatsAppButton";

// export const metadata: Metadata = {
//   title: { template: "%s | WheelRent", default: "WheelRent" },
// };

// interface Props {
//   children: React.ReactNode;
//   params: Promise<{ locale: string }>;
// }

// export default async function LocaleLayout({ children, params }: Props) {
//   const { locale } = await params;

//   if (!locales.includes(locale as (typeof locales)[number])) {
//     notFound();
//   }

//   const messages = await getMessages({ locale });
//   const isRTL = locale === "ar";

//   return (
//     <NextIntlClientProvider locale={locale} messages={messages}>
//       <div
//         className={`flex min-h-screen flex-col ${isRTL ? "font-arabic" : ""}`}
//         dir={isRTL ? "rtl" : "ltr"}
//       >
//         <Navbar locale={locale} />
//         <main className="flex-1">{children}</main>
//         <Footer locale={locale} />
//         <WhatsAppButton number={process.env.ORDER_PHONE!} />
//       </div>
//     </NextIntlClientProvider>
//   );
// }
