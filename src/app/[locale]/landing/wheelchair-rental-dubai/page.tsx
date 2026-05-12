import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import LandingPage from "@/components/landing/LandingPage";
import { getLandingProducts } from "@/lib/landing-products";
import { buildLandingMetadata, landingPages } from "@/lib/landing-pages";

const data = landingPages.dubai;

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== data.locale) {
    return {};
  }

  return buildLandingMetadata(data);
}

export default async function DubaiWheelchairRentalPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== data.locale) {
    notFound();
  }

  setRequestLocale(locale);
  const products = await getLandingProducts(data.key);
  return <LandingPage data={data} products={products} />;
}
