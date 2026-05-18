import type { Metadata } from "next";
import { getOptionalEnv } from "@/lib/env";
import { TERMS_VERSION } from "@/lib/terms";
import { getTermsContent } from "@/lib/terms-content";

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "BioMobility wheelchair and mobility equipment rental terms.",
};

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const trn = getOptionalEnv("COMPANY_TRN");
  const terms = getTermsContent(locale);

  return (
    <div className="page-container py-10">
      <article
        className={`mx-auto max-w-3xl ${isAr ? "text-right" : "text-left"}`}
        dir={isAr ? "rtl" : "ltr"}
        lang={isAr ? "ar" : "en"}
      >
        <p className="mb-2 text-sm font-medium text-primary-700">
          {terms.eyebrow}
        </p>
        <h1 className="section-heading mb-4">{terms.title}</h1>
        <div className="mb-8 space-y-2 text-sm leading-6 text-slate-500">
          <p>
            {terms.versionLabel}:{" "}
            <span dir="ltr" className="inline-block">
              {TERMS_VERSION}
            </span>
          </p>
          {trn && (
            <p>
              {terms.trnLabel}:{" "}
              <span dir="ltr" className="inline-block">
                {trn}
              </span>
            </p>
          )}
          <p>{terms.intro}</p>
        </div>

        <ol className="space-y-8">
          {terms.sections.map((section, sectionIndex) => (
            <li key={section.title}>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                <span dir="ltr" className="inline-block">
                  {sectionIndex + 1}.
                </span>{" "}
                {section.title}
              </h2>
              <ul
                className={`space-y-2 text-sm leading-7 text-slate-600 ${
                  isAr ? "pr-5" : "pl-5"
                }`}
              >
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="list-disc rounded-lg bg-slate-50 p-3 marker:text-primary-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
