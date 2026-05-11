import type { Metadata } from "next";
import { getOptionalEnv } from "@/lib/env";
import { TERMS_VERSION } from "@/lib/terms";

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "BioMobility wheelchair and mobility equipment rental terms.",
};

const englishSections = [
  {
    title: "Eligibility",
    items: [
      "BioMobility accepts bookings from UAE residents and tourists.",
      "The customer must be at least 18 years old and legally able to enter a rental agreement.",
      "A digital copy of either an Emirates ID or passport is accepted. Physical ID is not required during online booking.",
    ],
  },
  {
    title: "Booking And Verification",
    items: [
      "A reachable contact WhatsApp or phone number is required so BioMobility can coordinate the booking.",
      "Where admin confirmation is required, BioMobility aims to confirm the booking within 24 hours.",
      "Delivery windows are estimates and may be affected by traffic, building access, weather, or operational constraints.",
      "The customer must sign the rental agreement upon delivery.",
    ],
  },
  {
    title: "Security Deposit",
    items: [
      "The refundable security deposit is collected upon delivery and is not charged online.",
      "The deposit is refunded after pickup and inspection, normally within 24 to 72 hours.",
      "BioMobility may deduct reasonable amounts for damage, loss, theft, missing accessories, lost chargers, battery damage, excessive cleaning, or other losses caused during the rental period.",
    ],
  },
  {
    title: "Damage, Loss, And Accessories",
    items: [
      "The customer is responsible for keeping the equipment safe and using it only for its intended mobility support purpose.",
      "Lost chargers, damaged batteries, missing cushions, footrests, controllers, keys, bags, or other accessories may be deducted from the deposit or charged separately if the deposit is insufficient.",
      "Theft or total loss may be charged up to the replacement value of the equipment, accessories, delivery recovery costs, and any applicable administrative costs.",
    ],
  },
  {
    title: "Law And Consumer Rights",
    items: [
      "These terms are governed by the laws of the United Arab Emirates. Disputes should first be raised with BioMobility for good-faith resolution and may then be referred to the competent UAE courts or consumer protection authority where applicable.",
      "Nothing in these terms limits mandatory rights available under applicable UAE consumer protection laws, including UAE Federal Decree-Law No. 15 of 2020 on Consumer Protection and its implementing regulations, as amended or replaced.",
    ],
  },
];

const arabicSections = [
  {
    title: "الأهلية",
    items: [
      "تقبل BioMobility الحجوزات من المقيمين في دولة الإمارات والسياح.",
      "يجب أن يكون عمر العميل 18 سنة أو أكثر وأن يكون مؤهلا قانونيا لإبرام اتفاقية التأجير.",
      "يتم قبول نسخة رقمية من بطاقة الهوية الإماراتية أو جواز السفر. ولا يلزم تقديم الهوية الأصلية أثناء الحجز الإلكتروني.",
    ],
  },
  {
    title: "الحجز والتحقق",
    items: [
      "التحقق من رقم واتساب بواسطة رمز تحقق اختياري وقد يساعد BioMobility على تأكيد الحجز بشكل أسرع.",
      "عندما يتطلب الحجز تأكيدا إداريا، تسعى BioMobility إلى تأكيد الحجز خلال 24 ساعة.",
      "نوافذ التسليم تقديرية وقد تتأثر بحركة المرور أو الوصول إلى المبنى أو الطقس أو الظروف التشغيلية.",
      "يجب على العميل توقيع اتفاقية التأجير عند التسليم.",
    ],
  },
  {
    title: "مبلغ التأمين",
    items: [
      "يتم تحصيل مبلغ التأمين القابل للاسترداد عند التسليم ولا يتم تحصيله إلكترونيا.",
      "يتم رد مبلغ التأمين بعد الاستلام والفحص، عادة خلال 24 إلى 72 ساعة.",
      "يجوز لشركة BioMobility خصم مبالغ معقولة مقابل التلف أو الفقدان أو السرقة أو الملحقات المفقودة أو فقدان الشاحن أو تلف البطارية أو التنظيف الزائد أو أي خسائر أخرى خلال مدة التأجير.",
    ],
  },
  {
    title: "التلف والفقدان والملحقات",
    items: [
      "يتحمل العميل مسؤولية الحفاظ على المعدات واستخدامها فقط لغرض دعم الحركة المقصود.",
      "قد يتم خصم قيمة الشواحن المفقودة أو البطاريات التالفة أو الوسائد أو مساند القدم أو وحدات التحكم أو المفاتيح أو الحقائب أو الملحقات الأخرى من مبلغ التأمين أو تحصيلها بشكل منفصل إذا لم يكن مبلغ التأمين كافيا.",
      "في حالة السرقة أو الفقدان الكامل، قد يتم تحصيل قيمة استبدال المعدات والملحقات وتكاليف الاسترجاع وأي تكاليف إدارية مطبقة.",
    ],
  },
  {
    title: "القانون وحقوق المستهلك",
    items: [
      "تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة. يجب أولا طرح النزاعات على BioMobility لمحاولة حلها بحسن نية، ثم يمكن إحالتها إلى المحاكم الإماراتية المختصة أو جهة حماية المستهلك عند الاقتضاء.",
      "لا تحد هذه الشروط من أي حقوق إلزامية مقررة بموجب قوانين حماية المستهلك المعمول بها في دولة الإمارات، بما في ذلك المرسوم بقانون اتحادي رقم 15 لسنة 2020 بشأن حماية المستهلك ولائحته التنفيذية، بصيغته المعدلة أو المستبدلة.",
    ],
  },
];

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const trn = getOptionalEnv("COMPANY_TRN");
  const sections = isAr ? arabicSections : englishSections;

  return (
    <div className="page-container py-10">
      <article className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-medium text-primary-700">
          {isAr ? "شروط BioMobility" : "BioMobility Terms"}
        </p>
        <h1 className="section-heading mb-4">
          {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
        </h1>
        <div className="mb-8 space-y-2 text-sm text-slate-500">
          <p>
            {isAr
              ? `إصدار الشروط: ${TERMS_VERSION}`
              : `Terms version: ${TERMS_VERSION}`}
          </p>
          {trn && <p>{isAr ? `الرقم الضريبي: ${trn}` : `Company TRN: ${trn}`}</p>}
          <p>
            {isAr
              ? "تنبيه: يجب مراجعة النص القانوني العربي بواسطة مختص قبل الإطلاق الإنتاجي."
              : "Note: Arabic legal text should be human-reviewed before production launch."}
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {section.title}
              </h2>
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                {section.items.map((item) => (
                  <li key={item} className="rounded-lg bg-slate-50 p-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
