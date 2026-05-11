import Link from "next/link";
import { clsx } from "clsx";
import LandingImage from "@/components/landing/LandingImage";
import {
  getLandingContactLinks,
  type LandingEquipmentItem,
  type LandingFaqItem,
  type LandingPageData,
} from "@/lib/landing-pages";
import type { Locale } from "@/lib/seo";

interface LandingCtaButtonsProps {
  locale: Locale;
  primaryLabel: string;
  secondaryLabel: string;
  align?: "left" | "center";
}

function LandingCtaButtons({
  locale,
  primaryLabel,
  secondaryLabel,
  align = "left",
}: LandingCtaButtonsProps) {
  const contactLinks = getLandingContactLinks();
  const whatsappLabel = locale === "ar" ? "واتساب" : "WhatsApp";
  const callLabel =
    locale === "ar"
      ? "اتصل الآن"
      : secondaryLabel.includes("/")
        ? "Call Now"
        : secondaryLabel;

  return (
    <div
      className={clsx(
        "flex w-full flex-col gap-3 sm:w-auto sm:flex-row",
        align === "center" && "justify-center",
      )}
    >
      <Link
        href={`/${locale}/wheelchairs`}
        className="inline-flex w-full items-center justify-center rounded-lg bg-primary-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-800 sm:w-auto"
      >
        {primaryLabel}
      </Link>
      {contactLinks ? (
        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
          <Link
            href={contactLinks.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 sm:min-w-32"
          >
            {whatsappLabel}
          </Link>
          <Link
            href={contactLinks.callHref}
            className="inline-flex min-w-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 sm:min-w-32"
          >
            {callLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function LandingTrustBadges({ badges }: { badges: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {badges.map((badge) => (
        <div
          key={badge}
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/12 px-3 py-2 text-sm font-medium text-white backdrop-blur"
        >
          <span className="h-2 w-2 flex-none rounded-full bg-cyan-200" />
          <span>{badge}</span>
        </div>
      ))}
    </div>
  );
}

export function LandingHero({ data }: { data: LandingPageData }) {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_34%),linear-gradient(135deg,rgba(15,23,42,1),rgba(3,105,161,0.92))]" />
      <div className="page-container relative grid gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            {data.hero.eyebrow}
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-normal md:text-5xl lg:text-6xl">
            {data.hero.headline}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-100 md:text-lg">
            {data.hero.subtitle}
          </p>
          <div className="mt-7">
            <LandingCtaButtons
              locale={data.locale}
              primaryLabel={data.hero.primaryCta}
              secondaryLabel={data.hero.secondaryCta}
            />
          </div>
          <div className="mt-8">
            <LandingTrustBadges badges={data.trustBadges} />
          </div>
        </div>

        <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-2xl sm:min-h-[360px] md:min-h-[460px]">
          <LandingImage
            imageKey={data.hero.imageKey}
            alt={data.hero.imageAlt}
            priority
            sizes="(min-width: 1024px) 46vw, (min-width: 768px) 45vw, 100vw"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/72 to-transparent p-5">
            <p className="max-w-sm text-sm font-medium text-white">
              {data.locale === "ar"
                ? "توصيل سريع، تأمين واضح، ودعم ثنائي اللغة."
                : "Fast delivery, clear deposits, and bilingual support."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingProblemSolution({ data }: { data: LandingPageData }) {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="page-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-700">
            {data.problem.eyebrow}
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
            {data.problem.title}
          </h2>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.problem.painPoints.map((point) => (
              <div
                key={point}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              >
                {point}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5">
            <h3 className="text-xl font-semibold text-slate-950">
              {data.problem.solutionTitle}
            </h3>
            <p className="mt-2 leading-7 text-slate-700">
              {data.problem.solutionText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingEquipmentCards({
  locale,
  title,
  subtitle,
  items,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  items: LandingEquipmentItem[];
}) {
  return (
    <section className="bg-slate-50 py-14 md:py-20">
      <div className="page-container">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 leading-7 text-slate-600">{subtitle}</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((item) => (
            <Link
              key={item.title}
              href={`/${locale}/wheelchairs`}
              className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <LandingImage
                  imageKey={item.imageKey}
                  alt={item.title}
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingHowItWorks({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="page-container">
        <h2 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
          {title}
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => (
            <div
              key={step}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingDepositInfo({
  title,
  items,
  tone = "blue",
}: {
  title: string;
  items: string[];
  tone?: "blue" | "green";
}) {
  return (
    <section className="bg-slate-50 py-14 md:py-20">
      <div className="page-container">
        <div
          className={clsx(
            "rounded-lg border p-6 md:p-8",
            tone === "green"
              ? "border-emerald-200 bg-emerald-50"
              : "border-primary-100 bg-primary-50",
          )}
        >
          <h2 className="text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
            {title}
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-lg bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm"
              >
                <span
                  className={clsx(
                    "mt-2 h-2 w-2 flex-none rounded-full",
                    tone === "green" ? "bg-emerald-600" : "bg-primary-700",
                  )}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingInfoList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="page-container grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-start">
        <h2 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
          {title}
        </h2>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-slate-200 bg-white p-4 leading-7 text-slate-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCoverage({
  title,
  subtitle,
  cities,
}: {
  title: string;
  subtitle: string;
  cities: string[];
}) {
  return (
    <section className="bg-slate-50 py-14 md:py-20">
      <div className="page-container">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 leading-7 text-slate-600">{subtitle}</p>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cities.map((city) => (
            <div
              key={city}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm"
            >
              {city}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFAQ({
  title,
  faqs,
}: {
  title: string;
  faqs: LandingFaqItem[];
}) {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="page-container">
        <h2 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
          {title}
        </h2>
        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm open:border-primary-200 open:bg-primary-50"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-slate-950">
                <span className="inline-flex w-full items-center justify-between gap-4">
                  {faq.question}
                  <span className="text-xl leading-none text-primary-700 group-open:hidden">
                    +
                  </span>
                  <span className="hidden text-xl leading-none text-primary-700 group-open:block">
                    -
                  </span>
                </span>
              </summary>
              <p className="mt-3 leading-7 text-slate-700">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCTA({ data }: { data: LandingPageData }) {
  return (
    <section className="bg-slate-950 py-14 text-white md:py-20">
      <div className="page-container text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-normal md:text-4xl">
          {data.finalCta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-200">
          {data.finalCta.subtitle}
        </p>
        <div className="mt-8 flex justify-center">
          <LandingCtaButtons
            locale={data.locale}
            primaryLabel={data.finalCta.primaryCta}
            secondaryLabel={data.finalCta.secondaryCta}
            align="center"
          />
        </div>
      </div>
    </section>
  );
}
