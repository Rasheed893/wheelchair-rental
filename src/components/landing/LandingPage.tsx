import {
  LandingCTA,
  LandingCoverage,
  LandingDepositInfo,
  LandingEquipmentCards,
  LandingFAQ,
  LandingHero,
  LandingHowItWorks,
  LandingInfoList,
  LandingProblemSolution,
} from "@/components/landing/LandingSections";
import { buildLandingSchemas, type LandingPageData } from "@/lib/landing-pages";
import { serializeJsonLd } from "@/lib/structured-data";

export default function LandingPage({ data }: { data: LandingPageData }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildLandingSchemas(data)),
        }}
      />
      <div dir={data.locale === "ar" ? "rtl" : "ltr"} className="bg-white">
        <LandingHero data={data} />
        <LandingProblemSolution data={data} />
        <LandingEquipmentCards
          locale={data.locale}
          title={data.equipmentTitle}
          subtitle={data.equipmentSubtitle}
          items={data.equipment}
        />
        <LandingHowItWorks
          title={data.howItWorksTitle}
          steps={data.howItWorksSteps}
        />
        <LandingDepositInfo title={data.depositTitle} items={data.depositItems} />
        <LandingInfoList title={data.idTitle} items={data.idItems} />
        <LandingCoverage
          title={data.coverageTitle}
          subtitle={data.coverageSubtitle}
          cities={data.coverageCities}
        />
        <LandingFAQ title={data.faqTitle} faqs={data.faqs} />
        <LandingCTA data={data} />
      </div>
    </>
  );
}
