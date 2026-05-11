import type { Metadata } from "next";
import {
  absoluteUrl,
  buildIndexRobots,
  buildLocalizedUrl,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  type Locale,
} from "@/lib/seo";

export type LandingPageKey = "dubai" | "airport" | "surgery" | "arabic";
export type LandingImageKey =
  | LandingPageKey
  | "manual"
  | "electric"
  | "scooter"
  | "walker"
  | "stroller";

export const landingImages: Record<LandingImageKey, string> = {
  dubai: "/Landing/dubai-wheelchair.jfif",
  airport: "/Landing/airport-wheelchair.jfif",
  surgery: "/Landing/post-surgery-wheelchair.jfif",
  arabic: "/Landing/uae-wheelchair.jfif",
  manual: "/Landing/manual-wheelchair.jfif",
  electric: "/Landing/electric-wheelchair.jfif",
  scooter: "/Landing/mobility-scooter.jfif",
  walker: "/Landing/walker.jfif",
  stroller: "/Landing/stroller.jfif",
};

export const landingImageFallbacks: Partial<Record<LandingImageKey, string>> = {
  dubai: "/landing/Manual Wheelchair.jfif",
  airport: "/landing/Foldable scooter.jfif",
  surgery: "/landing/Electric Wheelchair.jfif",
  arabic: "/landing/Manual Wheelchair.jfif",
  manual: "/landing/Manual Wheelchair.jfif",
  electric: "/landing/Electric Wheelchair.jfif",
  scooter: "/landing/Electric Scooter.jfif",
  stroller: "/landing/Stroller.jfif",
};

export function getLandingImageSources(key: LandingImageKey) {
  return {
    src: landingImages[key],
    fallbackSrc: landingImageFallbacks[key],
  };
}

export function getLandingOrderPhone() {
  return process.env.NEXT_PUBLIC_ORDER_PHONE?.trim() || "";
}

export function cleanLandingPhone(phone: string) {
  return phone.replace(/[+\s\-()]/g, "");
}

export function getLandingContactLinks() {
  const phone = getLandingOrderPhone();
  const cleanPhone = cleanLandingPhone(phone);

  if (!phone || !cleanPhone) {
    return null;
  }

  return {
    callHref: `tel:${phone}`,
    whatsappHref: `https://wa.me/${cleanPhone}`,
  };
}

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export interface LandingEquipmentItem {
  title: string;
  description: string;
  imageKey: LandingImageKey;
}

export interface LandingPageData {
  key: LandingPageKey;
  locale: Locale;
  pathname: string;
  alternatePathname?: Partial<Record<Locale, string>>;
  title: string;
  description: string;
  keywords: string[];
  hero: {
    eyebrow: string;
    headline: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    imageKey: LandingImageKey;
    imageAlt: string;
  };
  trustBadges: string[];
  problem: {
    eyebrow: string;
    title: string;
    painPoints: string[];
    solutionTitle: string;
    solutionText: string;
  };
  equipmentTitle: string;
  equipmentSubtitle: string;
  equipment: LandingEquipmentItem[];
  howItWorksTitle: string;
  howItWorksSteps: string[];
  depositTitle: string;
  depositItems: string[];
  idTitle: string;
  idItems: string[];
  coverageTitle: string;
  coverageSubtitle: string;
  coverageCities: string[];
  faqTitle: string;
  faqs: LandingFaqItem[];
  finalCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
}

const englishTrustBadges = [
  "Same-day delivery",
  "UAE-wide support",
  "Manual & electric wheelchairs",
  "Passport or Emirates ID accepted",
];

const arabicTrustBadges = [
  "توصيل في نفس اليوم",
  "دعم في جميع الإمارات",
  "كراسي يدوية وكهربائية",
  "قبول جواز السفر أو الهوية الإماراتية",
];

const englishEquipment: LandingEquipmentItem[] = [
  {
    title: "Manual wheelchairs",
    description: "Lightweight options for home, hotel, clinic, and short outings.",
    imageKey: "manual",
  },
  {
    title: "Electric wheelchairs",
    description: "Powered mobility for longer days and extra independence.",
    imageKey: "electric",
  },
  {
    title: "Mobility scooters",
    description: "Stable support for travel, malls, hotels, and outdoor use.",
    imageKey: "scooter",
  },
  {
    title: "Walkers",
    description: "Simple support for recovery, balance, and indoor movement.",
    imageKey: "walker",
  },
  {
    title: "Strollers",
    description: "Practical family mobility support for visits and travel.",
    imageKey: "stroller",
  },
];

const arabicEquipment: LandingEquipmentItem[] = [
  {
    title: "كراسي متحركة يدوية",
    description: "خيارات خفيفة للمنزل والفندق والمستشفى والمشاوير القصيرة.",
    imageKey: "manual",
  },
  {
    title: "كراسي متحركة كهربائية",
    description: "دعم كهربائي مريح للأيام الطويلة والحركة باستقلالية أكبر.",
    imageKey: "electric",
  },
  {
    title: "سكوترات تنقل",
    description: "حل ثابت ومريح للفنادق والمراكز التجارية والتنقل الخارجي.",
    imageKey: "scooter",
  },
  {
    title: "مشايات",
    description: "دعم بسيط للتعافي والتوازن والحركة داخل المنزل.",
    imageKey: "walker",
  },
  {
    title: "عربات أطفال",
    description: "حل عملي للعائلات أثناء الزيارات والسفر داخل الإمارات.",
    imageKey: "stroller",
  },
];

const englishCoverage = [
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Abu Dhabi",
  "Ras Al Khaimah",
  "Fujairah",
  "Al Ain",
];

const arabicCoverage = [
  "دبي",
  "الشارقة",
  "عجمان",
  "أم القيوين",
  "أبوظبي",
  "رأس الخيمة",
  "الفجيرة",
  "العين",
];

const englishHowItWorks = [
  "Choose equipment",
  "Select delivery city/time window",
  "Confirm booking",
  "Receive delivery",
  "Deposit refunded after pickup inspection",
];

const arabicHowItWorks = [
  "اختر المعدات المناسبة",
  "حدد المدينة ووقت التوصيل",
  "أكد الحجز",
  "استلم الطلب",
  "يتم رد التأمين بعد الفحص عند الاستلام",
];

const englishDepositItems = [
  "Manual wheelchair, walkers, strollers: AED 500 refundable deposit.",
  "Electric wheelchair and scooters: AED 1000 refundable deposit.",
  "Deposit collected on delivery.",
  "Deposit is separate from rental price and refunded after inspection.",
];

const arabicDepositItems = [
  "الكرسي المتحرك اليدوي والمشايات وعربات الأطفال: تأمين مسترد بقيمة 500 درهم.",
  "الكرسي المتحرك الكهربائي والسكوترات: تأمين مسترد بقيمة 1000 درهم.",
  "يتم تحصيل التأمين عند التوصيل.",
  "التأمين منفصل عن سعر الإيجار ويتم رده بعد الفحص.",
];

const englishIdItems = [
  "UAE residents: Emirates ID copy accepted.",
  "Tourists: Passport copy accepted.",
  "Physical document is not required, digital copy accepted.",
];

const arabicIdItems = [
  "للمقيمين في الإمارات: تقبل نسخة من الهوية الإماراتية.",
  "للسياح: تقبل نسخة من جواز السفر.",
  "لا يلزم تسليم المستند الأصلي، وتقبل النسخة الرقمية.",
];

const englishFaqs: LandingFaqItem[] = [
  {
    question: "Can tourists rent?",
    answer:
      "Yes. Tourists can rent wheelchairs and mobility equipment with a passport copy and delivery to hotels, residences, or hospitals.",
  },
  {
    question: "Do I need Emirates ID?",
    answer:
      "UAE residents can use an Emirates ID copy. Tourists can use a passport copy instead.",
  },
  {
    question: "Is passport accepted?",
    answer:
      "Yes. A digital passport copy is accepted for tourist bookings and temporary rentals.",
  },
  {
    question: "Is deposit refundable?",
    answer:
      "Yes. The refundable deposit is returned after pickup inspection, provided the equipment is returned in acceptable condition.",
  },
  {
    question: "Can I pay cash on delivery?",
    answer:
      "Cash on delivery may be available for eligible orders. The team confirms payment options when your booking is arranged.",
  },
  {
    question: "Do you deliver to hotels/hospitals?",
    answer:
      "Yes. Delivery is available to homes, hotels, hospitals, clinics, and serviced apartments across supported UAE cities.",
  },
  {
    question: "How fast is delivery?",
    answer:
      "Same-day delivery is available when stock and delivery slots are open. Urgent requests are prioritized whenever possible.",
  },
];

const arabicFaqs: LandingFaqItem[] = [
  {
    question: "هل يمكن للسياح الاستئجار؟",
    answer:
      "نعم، يمكن للسياح استئجار الكراسي المتحركة ومعدات التنقل باستخدام نسخة من جواز السفر مع التوصيل للفنادق أو المنازل أو المستشفيات.",
  },
  {
    question: "هل أحتاج إلى الهوية الإماراتية؟",
    answer:
      "يمكن للمقيمين استخدام نسخة من الهوية الإماراتية، ويمكن للسياح استخدام نسخة من جواز السفر بدلا منها.",
  },
  {
    question: "هل يتم قبول جواز السفر؟",
    answer:
      "نعم، تقبل نسخة رقمية من جواز السفر لحجوزات السياح والإيجار المؤقت.",
  },
  {
    question: "هل التأمين مسترد؟",
    answer:
      "نعم، يتم رد التأمين بعد فحص المعدات عند الاستلام إذا كانت بحالة مناسبة.",
  },
  {
    question: "هل يمكن الدفع نقدا عند التوصيل؟",
    answer:
      "قد يتوفر الدفع نقدا عند التوصيل للطلبات المؤهلة، ويتم تأكيد خيارات الدفع عند ترتيب الحجز.",
  },
  {
    question: "هل يوجد توصيل للفنادق والمستشفيات؟",
    answer:
      "نعم، يتوفر التوصيل للمنازل والفنادق والمستشفيات والعيادات والشقق الفندقية في المدن المدعومة.",
  },
  {
    question: "ما سرعة التوصيل؟",
    answer:
      "يتوفر التوصيل في نفس اليوم عند توفر المعدات ومواعيد التوصيل، ويتم إعطاء الأولوية للطلبات العاجلة قدر الإمكان.",
  },
];

export const landingPages: Record<LandingPageKey, LandingPageData> = {
  dubai: {
    key: "dubai",
    locale: "en",
    pathname: "/landing/wheelchair-rental-dubai",
    alternatePathname: { ar: "/landing/wheelchair-rental-uae" },
    title: "Wheelchair Rental in Dubai with Fast Delivery",
    description:
      "Rent manual or electric wheelchairs in Dubai with same-day delivery to homes, hotels, and hospitals. Emirates ID or passport copy accepted.",
    keywords: [
      "wheelchair rental Dubai",
      "Dubai wheelchair rental",
      "rent wheelchair Dubai",
      "medical equipment rental Dubai",
    ],
    hero: {
      eyebrow: "Dubai wheelchair rental",
      headline: "Wheelchair Rental in Dubai with Fast Delivery",
      subtitle:
        "Short-term wheelchair and mobility equipment rental for Dubai residents, hotels, homes, and hospitals with simple ID requirements.",
      primaryCta: "Book a Wheelchair Now",
      secondaryCta: "WhatsApp / Call Now",
      imageKey: "dubai",
      imageAlt: "Wheelchair rental delivery service in Dubai",
    },
    trustBadges: englishTrustBadges,
    problem: {
      eyebrow: "Urgent mobility support",
      title: "When mobility becomes urgent, rental should feel simple.",
      painPoints: [
        "A family member needs support after a fall or temporary injury.",
        "A hotel guest or visitor needs a wheelchair without delay.",
        "A hospital discharge needs safe transport home.",
        "Elderly care needs reliable equipment for a few days or weeks.",
      ],
      solutionTitle: "BioMobility handles the equipment and delivery.",
      solutionText:
        "Choose the right wheelchair or mobility aid online, confirm the delivery window, and receive clean rental equipment at your Dubai address.",
    },
    equipmentTitle: "Rental equipment options",
    equipmentSubtitle:
      "Choose practical mobility support for short visits, recovery, travel, or everyday care.",
    equipment: englishEquipment,
    howItWorksTitle: "How it works",
    howItWorksSteps: englishHowItWorks,
    depositTitle: "Refundable deposit, explained clearly",
    depositItems: englishDepositItems,
    idTitle: "ID requirement",
    idItems: englishIdItems,
    coverageTitle: "Delivery coverage",
    coverageSubtitle: "BioMobility supports major UAE cities with delivery and pickup.",
    coverageCities: englishCoverage,
    faqTitle: "Frequently asked questions",
    faqs: englishFaqs,
    finalCta: {
      title: "Ready to arrange wheelchair rental in Dubai?",
      subtitle:
        "Book online or contact BioMobility for urgent Dubai delivery support.",
      primaryCta: "Book a Wheelchair Now",
      secondaryCta: "WhatsApp / Call Now",
    },
  },
  airport: {
    key: "airport",
    locale: "en",
    pathname: "/landing/dubai-airport-wheelchair-rental",
    title: "Wheelchair Rental for Dubai Airport Arrivals",
    description:
      "Arrange wheelchair rental for Dubai airport arrivals, tourist stays, and hotel delivery. Passport copy accepted for temporary mobility support.",
    keywords: [
      "Dubai airport wheelchair rental",
      "wheelchair rental for tourists Dubai",
      "airport arrival wheelchair Dubai",
      "hotel wheelchair delivery Dubai",
    ],
    hero: {
      eyebrow: "Airport arrival support",
      headline: "Wheelchair Rental for Dubai Airport Arrivals",
      subtitle:
        "Plan temporary mobility support before you land, with hotel delivery, passport copy accepted, and equipment options for your Dubai trip.",
      primaryCta: "Rent for Your Dubai Trip",
      secondaryCta: "WhatsApp / Call Now",
      imageKey: "airport",
      imageAlt: "Wheelchair rental for Dubai airport arrivals and hotel delivery",
    },
    trustBadges: englishTrustBadges,
    problem: {
      eyebrow: "Travel without last-minute stress",
      title: "Airport arrivals are easier when mobility support is ready.",
      painPoints: [
        "A tourist needs temporary mobility support after a long flight.",
        "A family wants equipment delivered to the hotel before check-in.",
        "A visitor does not have Emirates ID but can provide a passport copy.",
        "A short Dubai stay needs a simple rental instead of buying equipment.",
      ],
      solutionTitle: "BioMobility helps bridge the trip from arrival to hotel.",
      solutionText:
        "Book before or after landing, share a passport copy digitally, and arrange delivery to your hotel, residence, or hospital in Dubai.",
    },
    equipmentTitle: "Mobility support for your Dubai trip",
    equipmentSubtitle:
      "Select equipment for airport transfers, hotel stays, malls, family visits, and short-term travel needs.",
    equipment: englishEquipment,
    howItWorksTitle: "How it works",
    howItWorksSteps: englishHowItWorks,
    depositTitle: "Refundable deposit, explained clearly",
    depositItems: englishDepositItems,
    idTitle: "ID requirement for tourists",
    idItems: englishIdItems,
    coverageTitle: "Delivery coverage",
    coverageSubtitle:
      "Delivery is available to hotels, homes, hospitals, and serviced apartments in supported UAE cities.",
    coverageCities: englishCoverage,
    faqTitle: "Frequently asked questions",
    faqs: englishFaqs,
    finalCta: {
      title: "Landing in Dubai soon?",
      subtitle:
        "Reserve mobility equipment for your stay and keep your arrival plans smooth.",
      primaryCta: "Rent for Your Dubai Trip",
      secondaryCta: "WhatsApp / Call Now",
    },
  },
  surgery: {
    key: "surgery",
    locale: "en",
    pathname: "/landing/post-surgery-wheelchair-rental",
    title: "Wheelchair Rental After Surgery or Hospital Discharge",
    description:
      "Arrange short-term wheelchair rental after surgery, hospital discharge, or home recovery with UAE delivery and refundable deposit.",
    keywords: [
      "post surgery wheelchair rental",
      "hospital discharge wheelchair rental",
      "recovery wheelchair rental UAE",
      "temporary wheelchair rental",
    ],
    hero: {
      eyebrow: "Recovery mobility support",
      headline: "Wheelchair Rental After Surgery or Hospital Discharge",
      subtitle:
        "Safe temporary mobility support for families arranging post-surgery recovery, hospital discharge, and home care across the UAE.",
      primaryCta: "Arrange Recovery Support",
      secondaryCta: "WhatsApp / Call Now",
      imageKey: "surgery",
      imageAlt: "Post-surgery wheelchair rental for home recovery",
    },
    trustBadges: englishTrustBadges,
    problem: {
      eyebrow: "Support for recovery days",
      title: "Hospital discharge often needs equipment faster than expected.",
      painPoints: [
        "A patient needs safe movement at home after surgery.",
        "Family members need equipment ready before hospital discharge.",
        "A temporary injury makes walking painful or unsafe.",
        "Elderly care needs reliable mobility support without buying equipment.",
      ],
      solutionTitle: "BioMobility helps families arrange short-term support.",
      solutionText:
        "Choose equipment, set the delivery city and time window, and receive rental mobility support for recovery at home.",
    },
    equipmentTitle: "Recovery equipment options",
    equipmentSubtitle:
      "Practical rental choices for hospital discharge, home recovery, elderly care, and temporary injuries.",
    equipment: englishEquipment,
    howItWorksTitle: "How it works",
    howItWorksSteps: englishHowItWorks,
    depositTitle: "Refundable deposit, explained clearly",
    depositItems: englishDepositItems,
    idTitle: "ID requirement",
    idItems: englishIdItems,
    coverageTitle: "Delivery coverage",
    coverageSubtitle:
      "Delivery and pickup are available for homes, hospitals, clinics, and recovery stays.",
    coverageCities: englishCoverage,
    faqTitle: "Frequently asked questions",
    faqs: englishFaqs,
    finalCta: {
      title: "Need recovery mobility support?",
      subtitle:
        "Arrange wheelchair rental for discharge day, home care, or temporary injury recovery.",
      primaryCta: "Arrange Recovery Support",
      secondaryCta: "WhatsApp / Call Now",
    },
  },
  arabic: {
    key: "arabic",
    locale: "ar",
    pathname: "/landing/wheelchair-rental-uae",
    alternatePathname: { en: "/landing/wheelchair-rental-dubai" },
    title: "تأجير كراسي متحركة في الإمارات مع التوصيل",
    description:
      "استأجر كرسيا متحركا يدويا أو كهربائيا في الإمارات مع التوصيل، وقبول نسخة الهوية الإماراتية أو جواز السفر، وتأمين مسترد واضح.",
    keywords: [
      "تأجير كراسي متحركة في الإمارات",
      "تأجير كرسي متحرك دبي",
      "كرسي متحرك للإيجار",
      "تأجير معدات تنقل",
    ],
    hero: {
      eyebrow: "تأجير معدات التنقل في الإمارات",
      headline: "تأجير كراسي متحركة في الإمارات مع التوصيل",
      subtitle:
        "خدمة تأجير كراسي متحركة يدوية وكهربائية ومعدات تنقل مع توصيل ودعم في جميع الإمارات، وقبول نسخة الهوية أو جواز السفر.",
      primaryCta: "احجز الآن",
      secondaryCta: "اتصل أو واتساب",
      imageKey: "arabic",
      imageAlt: "تأجير كراسي متحركة في الإمارات مع التوصيل",
    },
    trustBadges: arabicTrustBadges,
    problem: {
      eyebrow: "دعم سريع للحركة",
      title: "عندما تحتاج إلى كرسي متحرك بسرعة، يجب أن يكون الحجز واضحا وسهلا.",
      painPoints: [
        "حاجة عاجلة بعد إصابة مؤقتة أو عملية جراحية.",
        "خروج من المستشفى مع حاجة آمنة للحركة في المنزل.",
        "رعاية كبار السن لفترة قصيرة أو طويلة.",
        "زائر أو سائح يحتاج إلى دعم مؤقت أثناء الإقامة.",
      ],
      solutionTitle: "BioMobility توفر المعدات والتوصيل بخطوات بسيطة.",
      solutionText:
        "اختر الكرسي أو معدات التنقل المناسبة، حدد المدينة ووقت التوصيل، واستلم المعدات النظيفة في عنوانك داخل الإمارات.",
    },
    equipmentTitle: "خيارات المعدات المتاحة",
    equipmentSubtitle:
      "اختر دعما مناسبا للتعافي أو السفر أو الرعاية اليومية أو الاحتياجات المؤقتة.",
    equipment: arabicEquipment,
    howItWorksTitle: "طريقة الحجز",
    howItWorksSteps: arabicHowItWorks,
    depositTitle: "شرح التأمين المسترد",
    depositItems: arabicDepositItems,
    idTitle: "متطلبات الهوية",
    idItems: arabicIdItems,
    coverageTitle: "مناطق التوصيل",
    coverageSubtitle:
      "تدعم BioMobility التوصيل والاستلام في المدن الرئيسية داخل الإمارات.",
    coverageCities: arabicCoverage,
    faqTitle: "الأسئلة الشائعة",
    faqs: arabicFaqs,
    finalCta: {
      title: "هل تحتاج إلى كرسي متحرك في الإمارات؟",
      subtitle:
        "احجز الآن أو تواصل معنا لترتيب التوصيل السريع والدعم المناسب.",
      primaryCta: "احجز الآن",
      secondaryCta: "اتصل أو واتساب",
    },
  },
};

function landingAlternates(data: LandingPageData): NonNullable<Metadata["alternates"]> {
  const canonical = buildLocalizedUrl(data.locale, data.pathname);
  const languages: Record<string, string> = {
    [data.locale === "ar" ? "ar-AE" : "en-AE"]: canonical,
    "x-default": data.locale === "en" ? canonical : buildLocalizedUrl("en", "/landing/wheelchair-rental-dubai"),
  };

  if (data.alternatePathname?.en) {
    languages["en-AE"] = buildLocalizedUrl("en", data.alternatePathname.en);
  }

  if (data.alternatePathname?.ar) {
    languages["ar-AE"] = buildLocalizedUrl("ar", data.alternatePathname.ar);
  }

  return { canonical, languages };
}

export function buildLandingMetadata(data: LandingPageData): Metadata {
  const image =
    encodeURI(absoluteUrl(landingImages[data.hero.imageKey])) || DEFAULT_OG_IMAGE;

  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    alternates: landingAlternates(data),
    robots: buildIndexRobots(),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: data.locale === "ar" ? "ar_AE" : "en_AE",
      alternateLocale: data.locale === "ar" ? ["en_AE"] : ["ar_AE"],
      url: buildLocalizedUrl(data.locale, data.pathname),
      title: data.title,
      description: data.description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: data.hero.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
      images: [image],
    },
  };
}

export function buildLandingSchemas(data: LandingPageData) {
  const pageUrl = buildLocalizedUrl(data.locale, data.pathname);
  const image =
    encodeURI(absoluteUrl(landingImages[data.hero.imageKey])) || DEFAULT_OG_IMAGE;

  return [
    {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "MedicalBusiness"],
      "@id": absoluteUrl("/#business"),
      name: SITE_NAME,
      url: buildLocalizedUrl(data.locale, "/"),
      image,
      logo: absoluteUrl("/branding/icon-512x512.png"),
      description: data.description,
      areaServed: {
        "@type": "Country",
        name: "United Arab Emirates",
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "AE",
      },
      availableLanguage: ["en", "ar"],
      telephone: getLandingOrderPhone() || undefined,
      priceRange: "AED",
      currenciesAccepted: "AED",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: data.title,
      serviceType: "Wheelchair and mobility equipment rental",
      provider: {
        "@type": ["LocalBusiness", "MedicalBusiness"],
        name: SITE_NAME,
        url: buildLocalizedUrl(data.locale, "/"),
      },
      areaServed: data.coverageCities.map((city) => ({
        "@type": "City",
        name: city,
      })),
      url: pageUrl,
      description: data.description,
      offers: {
        "@type": "Offer",
        priceCurrency: "AED",
        availability: "https://schema.org/InStock",
        businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: data.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: data.locale === "ar" ? "الرئيسية" : "Home",
          item: buildLocalizedUrl(data.locale, "/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: data.locale === "ar" ? "تأجير كراسي متحركة" : "Wheelchair rental",
          item: pageUrl,
        },
      ],
    },
  ];
}
