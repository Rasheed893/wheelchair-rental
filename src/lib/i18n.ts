// src/lib/i18n.ts

import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  // 🚨 TEMP: DO NOT call notFound yet
  if (!locale || !locales.includes(locale as Locale)) {
    return {
      locale: "en",
      messages: {},
    };
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
