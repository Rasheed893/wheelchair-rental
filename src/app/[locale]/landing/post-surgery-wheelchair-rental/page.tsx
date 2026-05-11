import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import LandingPage from "@/components/landing/LandingPage";
import { buildLandingMetadata, landingPages } from "@/lib/landing-pages";

const data = landingPages.surgery;

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

export default async function PostSurgeryWheelchairRentalPage({
  params,
}: Props) {
  const { locale } = await params;
  if (locale !== data.locale) {
    notFound();
  }

  setRequestLocale(locale);
  return <LandingPage data={data} />;
}
