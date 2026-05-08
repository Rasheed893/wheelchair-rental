import type { Metadata } from "next";
import PaymentSuccessContent from "@/components/booking/PaymentSuccessContent";
import { buildNoIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: buildNoIndexRobots(),
};

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bookingId?: string; payment_intent?: string; method?: string }>;
}) {
  const { locale } = await params;
  const { bookingId, payment_intent, method } = await searchParams;

  return (
    <PaymentSuccessContent
      locale={locale}
      bookingId={bookingId}
      paymentIntentId={payment_intent}
      method={method}
    />
  );
}
