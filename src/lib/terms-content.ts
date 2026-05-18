export type TermsLocale = "en" | "ar";

export type TermsSection = {
  title: string;
  items: string[];
};

export type TermsContent = {
  eyebrow: string;
  title: string;
  versionLabel: string;
  version: string;
  effectiveDate: string;
  trnLabel: string;
  trnValue: string;
  governingEmirate: string;
  intro: string;
  sections: TermsSection[];
  drawerSummary: string[];
};

const englishTerms: TermsContent = {
  eyebrow: "BioMobility Terms",
  title: "Terms & Conditions",
  versionLabel: "Terms version",
  version: "2025-v1",
  effectiveDate: "1 June 2025",
  trnLabel: "Company TRN",
  trnValue: process.env.NEXT_PUBLIC_BIOMOBILITY_TRN || "100XXXXXXXXX0003",
  governingEmirate: "Dubai",
  intro:
    "These terms apply to wheelchair and mobility equipment rentals provided by BioMobility in the United Arab Emirates.",
  sections: [
    {
      title: "Rental terms",
      items: [
        "BioMobility accepts bookings from UAE residents and tourists who are at least 18 years old and legally able to enter a rental agreement.",
        "The rental period, delivery address, delivery window, equipment type, daily rate, delivery fee, VAT, and total amount are confirmed during booking.",
        "The customer must use the equipment only for its intended mobility support purpose and must not sub-rent, sell, pledge, modify, or misuse it.",
      ],
    },
    {
      title: "Identity verification",
      items: [
        "A digital copy of an Emirates ID is accepted for UAE residents.",
        "A digital passport copy is accepted for tourists and visitors.",
        "The document copy is used for rental verification and admin handling. Physical ID is not required during online booking unless BioMobility reasonably requests additional verification.",
      ],
    },
    {
      title: "Security deposit",
      items: [
        "A refundable security deposit is collected in cash by the driver at the time of delivery. It is not charged online.",
        "AED 500 applies to manual wheelchairs, walkers, and strollers.",
        "AED 1,000 applies to electric wheelchairs and scooters.",
        "The deposit is refunded after collection and inspection, normally within 24 to 72 hours, provided the equipment and accessories are returned in acceptable condition.",
        "If the customer is unable or unwilling to provide the deposit on delivery, BioMobility reserves the right to withhold the equipment until the deposit is received.",
      ],
    },
    {
      title: "Deposit refund and deductions",
      items: [
        "BioMobility may deduct reasonable amounts from the deposit for damage, loss, theft, missing accessories, lost chargers, battery damage, excessive cleaning, late return, recovery costs, or other losses caused during the rental period.",
        "Examples of normal wear include minor surface scuffs and expected tyre wear. Structural damage, broken parts, and missing components are not considered normal wear.",
        "If the deposit is not enough to cover the loss, BioMobility may charge the remaining amount separately.",
        "BioMobility will notify the customer in writing — via WhatsApp or email — of the deduction reason before or at the time of processing the partial refund, as required under UAE Consumer Protection Law.",
      ],
    },
    {
      title: "Equipment responsibility",
      items: [
        "The customer is responsible for keeping the equipment safe from delivery until collection.",
        "The customer must check the equipment on delivery and promptly report any visible issue, missing accessory, or safety concern.",
        "The customer must not use equipment that appears unsafe and should contact BioMobility for support or replacement guidance.",
      ],
    },
    {
      title: "Delivery and collection",
      items: [
        "Delivery and collection windows are estimates and may be affected by traffic, building access, weather, customer availability, or operational constraints.",
        "The customer must provide accurate location details, access instructions, and a reachable phone or WhatsApp number.",
        "Additional charges may apply for failed delivery, failed collection, remote locations, changed addresses, waiting time, or repeated visits.",
      ],
    },
    {
      title: "Cancellation policy",
      items: [
        "Cancellations requested before the order is dispatched will receive a full refund.",
        "Cancellations requested after dispatch may incur the applicable delivery fee.",
        "Refunds are processed within 5 to 10 business days, depending on the payment method and bank processing timelines.",
      ],
    },
    {
      title: "VAT and tax",
      items: [
        "All rental fees are subject to 5% Value Added Tax (VAT) as required by the UAE Federal Tax Authority.",
        "BioMobility's Tax Registration Number (TRN) is displayed on all invoices and booking confirmations.",
      ],
    },
    {
      title: "Digital and e-signature acceptance",
      items: [
        "By submitting a booking, accepting these terms, paying online, confirming by WhatsApp, or signing on delivery, the customer accepts the rental agreement electronically.",
        "Electronic records, digital acceptance, WhatsApp confirmations, uploaded documents, and e-signatures may be used as evidence of the rental agreement in accordance with UAE Federal Law No. 1 of 2006 on Electronic Commerce and Transactions.",
      ],
    },
    {
      title: "Customer communication",
      items: [
        "The customer agrees that BioMobility may contact them by phone, WhatsApp, SMS, or email for booking confirmation, delivery coordination, payment, collection, support, and rental follow-up.",
        "The customer must keep contact details reachable during the rental period and respond to reasonable delivery, collection, and support communications.",
      ],
    },
    {
      title: "Limitation of liability",
      items: [
        "BioMobility is not liable for injuries, losses, or damages arising from misuse of equipment, failure to follow usage instructions, or customer negligence.",
        "BioMobility's liability in connection with any rental is limited to the rental fees paid for that booking.",
        "Nothing in these terms excludes or limits liability for gross negligence, fraud, or any liability that cannot be excluded under applicable UAE law.",
      ],
    },
    {
      title: "UAE governing law",
      items: [
        "These terms are governed by the laws of the United Arab Emirates and the emirate of Dubai.",
        "Disputes should first be raised with BioMobility for good-faith resolution and may then be referred to the competent UAE courts or consumer protection authority where applicable.",
        "Nothing in these terms limits mandatory rights available under applicable UAE consumer protection laws.",
      ],
    },
  ],
  drawerSummary: [
    "UAE residents and tourists are accepted. Customers must be 18+ and provide a digital Emirates ID or passport copy.",
    "The refundable security deposit is collected in cash by the driver on delivery: AED 500 for manual wheelchairs, walkers, and strollers; AED 1,000 for electric wheelchairs and scooters.",
    "Deposits are refunded after collection and inspection, normally within 24 to 72 hours. Deductions may apply for damage, loss, theft, missing accessories, lost chargers, or battery damage. You will be notified in writing before any deduction is made.",
    "Cancellations before dispatch receive a full refund. Cancellations after dispatch may incur the delivery fee. Refunds take 5 to 10 business days.",
    "All fees include 5% VAT. By booking, paying online, confirming by WhatsApp, or signing on delivery, you accept this rental agreement electronically.",
  ],
};

const arabicTerms: TermsContent = {
  eyebrow: "شروط BioMobility",
  title: "الشروط والأحكام",
  versionLabel: "إصدار الشروط",
  version: "2025-v1",
  effectiveDate: "1 يونيو 2025",
  trnLabel: "الرقم الضريبي للشركة",
  trnValue: "100XXXXXXXXX0003",
  governingEmirate: "دبي",
  intro:
    "تسري هذه الشروط على تأجير الكراسي المتحركة ومعدات دعم الحركة التي تقدمها BioMobility داخل دولة الإمارات العربية المتحدة.",
  sections: [
    {
      title: "شروط التأجير",
      items: [
        "تقبل BioMobility الحجوزات من المقيمين في دولة الإمارات والسياح، بشرط أن يكون عمر العميل 18 سنة أو أكثر وأن يكون مؤهلاً قانونياً لإبرام اتفاقية التأجير.",
        "يتم تأكيد مدة التأجير، وعنوان التوصيل، ونافذة التوصيل، ونوع المعدة، والسعر اليومي، ورسوم التوصيل، وضريبة القيمة المضافة، والمبلغ الإجمالي أثناء الحجز.",
        "يلتزم العميل باستخدام المعدة فقط لغرض دعم الحركة المخصص لها، ولا يجوز له إعادة تأجيرها أو بيعها أو رهنها أو تعديلها أو إساءة استخدامها.",
      ],
    },
    {
      title: "التحقق من الهوية",
      items: [
        "تقبل نسخة رقمية من الهوية الإماراتية للمقيمين داخل دولة الإمارات.",
        "تقبل نسخة رقمية من جواز السفر للسياح والزوار.",
        "تستخدم نسخة المستند لأغراض التحقق من الحجز والمعالجة الإدارية. ولا يلزم تقديم المستند الأصلي أثناء الحجز الإلكتروني ما لم تطلب BioMobility تحققاً إضافياً لسبب معقول.",
      ],
    },
    {
      title: "مبلغ التأمين",
      items: [
        "يُحصَّل مبلغ التأمين القابل للاسترداد نقداً من قِبَل السائق عند التوصيل، ولا يتم تحصيله إلكترونياً.",
        "يطبق مبلغ 500 درهم على الكراسي المتحركة اليدوية والمشايات وعربات الأطفال.",
        "يطبق مبلغ 1,000 درهم على الكراسي المتحركة الكهربائية والسكوترات.",
        "يرد مبلغ التأمين بعد الاستلام والفحص، عادة خلال 24 إلى 72 ساعة، بشرط إعادة المعدة والملحقات بحالة مقبولة.",
        "إذا رفض العميل أو تعذّر عليه تقديم مبلغ التأمين عند التوصيل، يحق لشركة BioMobility تأجيل تسليم المعدة حتى استلام التأمين.",
      ],
    },
    {
      title: "رد التأمين والخصومات",
      items: [
        "يجوز لشركة BioMobility خصم مبالغ معقولة من التأمين مقابل التلف أو الفقدان أو السرقة أو الملحقات المفقودة أو فقدان الشاحن أو تلف البطارية أو التنظيف الزائد أو التأخر في الإرجاع أو تكاليف الاسترداد أو أي خسائر أخرى تحدث خلال مدة التأجير.",
        "تشمل أمثلة الاستهلاك الطبيعي الخدوش السطحية البسيطة والتآكل المعتاد في الإطارات. أما الأضرار الهيكلية والأجزاء المكسورة والمكونات المفقودة فلا تعد استهلاكاً طبيعياً.",
        "إذا لم يكن مبلغ التأمين كافياً لتغطية الخسارة، يجوز لشركة BioMobility مطالبة العميل بالمبلغ المتبقي بشكل منفصل.",
        "ستُبلِّغ BioMobility العميل كتابياً عبر واتساب أو البريد الإلكتروني بسبب الخصم قبل معالجة رد التأمين الجزئي أو عند معالجته، وفقاً لقانون حماية المستهلك الإماراتي.",
      ],
    },
    {
      title: "مسؤولية المعدات",
      items: [
        "يتحمل العميل مسؤولية الحفاظ على المعدة من وقت التوصيل حتى وقت الاستلام.",
        "يجب على العميل فحص المعدة عند التوصيل وإبلاغ BioMobility فوراً عن أي مشكلة ظاهرة أو ملحق مفقود أو ملاحظة تتعلق بالسلامة.",
        "يجب على العميل عدم استخدام أي معدة تبدو غير آمنة، وعليه التواصل مع BioMobility للحصول على الدعم أو إرشادات الاستبدال.",
      ],
    },
    {
      title: "التوصيل والاستلام",
      items: [
        "تعد نوافذ التوصيل والاستلام تقديرية، وقد تتأثر بحركة المرور أو الوصول إلى المبنى أو الطقس أو توفر العميل أو الظروف التشغيلية.",
        "يلتزم العميل بتقديم تفاصيل موقع دقيقة، وتعليمات وصول واضحة، ورقم هاتف أو واتساب يمكن التواصل عليه.",
        "قد تطبق رسوم إضافية في حال تعذر التوصيل أو الاستلام، أو كان الموقع بعيداً، أو تم تغيير العنوان، أو حدث انتظار طويل، أو تطلب الأمر زيارات متكررة.",
      ],
    },
    {
      title: "سياسة الإلغاء",
      items: [
        "تحصل الإلغاءات المطلوبة قبل إرسال الطلب على استرداد كامل للمبلغ.",
        "قد تخضع الإلغاءات المطلوبة بعد الإرسال لرسوم التوصيل المعمول بها.",
        "تتم معالجة المبالغ المستردة خلال 5 إلى 10 أيام عمل، بحسب طريقة الدفع ومدد المعالجة لدى البنك.",
      ],
    },
    {
      title: "ضريبة القيمة المضافة والضرائب",
      items: [
        "تخضع جميع رسوم التأجير لضريبة القيمة المضافة بنسبة 5% وفقاً لمتطلبات الهيئة الاتحادية للضرائب في دولة الإمارات.",
        "يظهر الرقم الضريبي لـ BioMobility على جميع الفواتير وتأكيدات الحجز.",
      ],
    },
    {
      title: "قبول التوقيع الإلكتروني والرقمي",
      items: [
        "من خلال إرسال الحجز أو قبول هذه الشروط أو الدفع إلكترونياً أو التأكيد عبر واتساب أو التوقيع عند التوصيل، يوافق العميل على اتفاقية التأجير إلكترونياً.",
        "يجوز استخدام السجلات الإلكترونية وتأكيدات واتساب والمستندات المرفوعة والتوقيعات الإلكترونية كدليل على اتفاقية التأجير وفقاً للقانون الاتحادي رقم 1 لسنة 2006 بشأن المعاملات والتجارة الإلكترونية.",
      ],
    },
    {
      title: "التواصل مع العميل",
      items: [
        "يوافق العميل على أن تتواصل معه BioMobility عبر الهاتف أو واتساب أو الرسائل النصية أو البريد الإلكتروني لأغراض تأكيد الحجز وتنسيق التوصيل والدفع والاستلام والدعم ومتابعة التأجير.",
        "يلتزم العميل بإبقاء بيانات التواصل متاحة خلال مدة التأجير والرد على الاتصالات المعقولة المتعلقة بالتوصيل أو الاستلام أو الدعم.",
      ],
    },
    {
      title: "حدود المسؤولية",
      items: [
        "لا تتحمل BioMobility المسؤولية عن أي إصابات أو خسائر أو أضرار ناجمة عن إساءة استخدام المعدة أو عدم اتباع تعليمات الاستخدام أو إهمال العميل.",
        "تقتصر مسؤولية BioMobility فيما يتعلق بأي تأجير على رسوم التأجير المدفوعة لذلك الحجز.",
        "لا تستثني هذه الشروط أو تحد من المسؤولية الناجمة عن الإهمال الجسيم أو الاحتيال أو أي مسؤولية لا يمكن استثناؤها بموجب القانون الإماراتي المعمول به.",
      ],
    },
    {
      title: "القانون الواجب التطبيق في دولة الإمارات",
      items: [
        "تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة وإمارة دبي.",
        "يجب أولاً عرض النزاعات على BioMobility لمحاولة حلها بحسن نية، ثم يجوز إحالتها إلى المحاكم الإماراتية المختصة أو جهة حماية المستهلك عند الاقتضاء.",
        "لا تحد هذه الشروط من أي حقوق إلزامية مقررة بموجب قوانين حماية المستهلك المعمول بها في دولة الإمارات.",
      ],
    },
  ],
  drawerSummary: [
    "تقبل الحجوزات من المقيمين في دولة الإمارات والسياح. يجب أن يكون عمر العميل 18 سنة أو أكثر وأن يقدم نسخة رقمية من الهوية الإماراتية أو جواز السفر.",
    "يُحصَّل مبلغ التأمين القابل للاسترداد نقداً من السائق عند التوصيل: 500 درهم للكراسي المتحركة اليدوية والمشايات وعربات الأطفال، و1,000 درهم للكراسي المتحركة الكهربائية والسكوترات.",
    "يرد التأمين بعد الاستلام والفحص، عادةً خلال 24 إلى 72 ساعة. قد تطبق خصومات عند وجود تلف أو فقدان أو سرقة أو ملحقات مفقودة أو شاحن مفقود أو تلف في البطارية. ستتلقى إشعاراً كتابياً قبل أي خصم.",
    "تحصل الإلغاءات قبل الإرسال على استرداد كامل. قد تخضع الإلغاءات بعد الإرسال لرسوم التوصيل. تتم معالجة المبالغ المستردة خلال 5 إلى 10 أيام عمل.",
    "تشمل جميع الرسوم ضريبة القيمة المضافة 5%. من خلال الحجز أو الدفع إلكترونياً أو التأكيد عبر واتساب أو التوقيع عند التوصيل، تقبل اتفاقية التأجير إلكترونياً.",
  ],
};

export function getTermsContent(locale: string): TermsContent {
  return locale === "ar" ? arabicTerms : englishTerms;
}
// export type TermsLocale = "en" | "ar";

// export type TermsSection = {
//   title: string;
//   items: string[];
// };

// export type TermsContent = {
//   eyebrow: string;
//   title: string;
//   versionLabel: string;
//   trnLabel: string;
//   intro: string;
//   sections: TermsSection[];
//   drawerSummary: string[];
// };

// const englishTerms: TermsContent = {
//   eyebrow: "BioMobility Terms",
//   title: "Terms & Conditions",
//   versionLabel: "Terms version",
//   trnLabel: "Company TRN",
//   intro:
//     "These terms apply to wheelchair and mobility equipment rentals arranged through BioMobility in the United Arab Emirates.",
//   sections: [
//     {
//       title: "Rental Terms",
//       items: [
//         "BioMobility accepts bookings from UAE residents and tourists who are at least 18 years old and legally able to enter a rental agreement.",
//         "The rental period, delivery address, delivery window, equipment type, daily rate, delivery fee, VAT, and total amount are confirmed during booking.",
//         "The customer must use the equipment only for its intended mobility support purpose and must not sub-rent, sell, pledge, modify, or misuse it.",
//       ],
//     },
//     {
//       title: "Emirates ID / Passport Copy",
//       items: [
//         "A digital copy of an Emirates ID is accepted for UAE residents.",
//         "A digital passport copy is accepted for tourists and visitors.",
//         "The document copy is used for rental verification and admin handling. Physical ID is not required during online booking unless BioMobility reasonably requests additional verification.",
//       ],
//     },
//     {
//       title: "Security Deposit",
//       items: [
//         "A refundable security deposit is due on delivery and is not charged online unless separately agreed.",
//         "AED 500 applies to manual wheelchairs, walkers, and strollers.",
//         "AED 1000 applies to electric wheelchairs and scooters.",
//         "The deposit is refunded after collection and inspection, normally within 24 to 72 hours, provided the equipment and accessories are returned in acceptable condition.",
//       ],
//     },
//     {
//       title: "Deposit Refund And Deductions",
//       items: [
//         "BioMobility may deduct reasonable amounts from the deposit for damage, loss, theft, missing accessories, lost chargers, battery damage, excessive cleaning, late return, recovery costs, or other losses caused during the rental period.",
//         "If the deposit is not enough to cover the loss, BioMobility may charge the remaining amount separately.",
//         "Normal wear from careful use is not treated as damage.",
//       ],
//     },
//     {
//       title: "Equipment Responsibility",
//       items: [
//         "The customer is responsible for keeping the equipment safe from delivery until collection.",
//         "The customer must check the equipment on delivery and promptly report any visible issue, missing accessory, or safety concern.",
//         "The customer must not use equipment that appears unsafe and should contact BioMobility for support or replacement guidance.",
//       ],
//     },
//     {
//       title: "Delivery And Collection",
//       items: [
//         "Delivery and collection windows are estimates and may be affected by traffic, building access, weather, customer availability, or operational constraints.",
//         "The customer must provide accurate location details, access instructions, and a reachable phone or WhatsApp number.",
//         "Additional charges may apply for failed delivery, failed collection, remote locations, changed addresses, waiting time, or repeated visits.",
//       ],
//     },
//     {
//       title: "Cancellation Policy",
//       items: [
//         "Customers should request cancellation as early as possible through BioMobility support or the available booking channel.",
//         "Confirmed bookings may be subject to cancellation limits, delivery preparation costs, payment processor fees, or other reasonable costs already incurred.",
//         "Refund timing depends on the payment method, bank, and payment processor timelines.",
//       ],
//     },
//     {
//       title: "Digital / E-Signature Acceptance",
//       items: [
//         "By submitting a booking, accepting these terms, paying online, confirming by WhatsApp, or signing on delivery, the customer accepts the rental agreement electronically.",
//         "Electronic records, digital acceptance, WhatsApp confirmations, uploaded documents, and e-signatures may be used as evidence of the rental agreement.",
//       ],
//     },
//     {
//       title: "Customer Communication Terms",
//       items: [
//         "The customer agrees that BioMobility may contact them by phone, WhatsApp, SMS, or email for booking confirmation, delivery coordination, payment, collection, support, and rental follow-up.",
//         "The customer must keep contact details reachable during the rental period and respond to reasonable delivery, collection, and support communications.",
//       ],
//     },
//     {
//       title: "UAE Governing Law",
//       items: [
//         "These terms are governed by the laws of the United Arab Emirates.",
//         "Disputes should first be raised with BioMobility for good-faith resolution and may then be referred to the competent UAE courts or consumer protection authority where applicable.",
//         "Nothing in these terms limits mandatory rights available under applicable UAE consumer protection laws.",
//       ],
//     },
//   ],
//   drawerSummary: [
//     "UAE residents and tourists are accepted. Customers must be 18+ and provide a digital Emirates ID or passport copy.",
//     "The refundable security deposit is due on delivery: AED 500 for manual wheelchairs, walkers, and strollers; AED 1000 for electric wheelchairs and scooters.",
//     "Deposits are refunded after collection and inspection, normally within 24 to 72 hours. Deductions may apply for damage, loss, theft, missing accessories, lost chargers, battery damage, or other rental-period losses.",
//     "Delivery and collection windows are estimates. Customers must provide accurate location details and a reachable phone or WhatsApp number.",
//     "By booking, accepting these terms, paying online, confirming by WhatsApp, or signing on delivery, the customer accepts the rental agreement electronically.",
//   ],
// };

// const arabicTerms: TermsContent = {
//   eyebrow: "شروط BioMobility",
//   title: "الشروط والأحكام",
//   versionLabel: "إصدار الشروط",
//   trnLabel: "الرقم الضريبي للشركة",
//   intro:
//     "تسري هذه الشروط على تأجير الكراسي المتحركة ومعدات دعم الحركة التي يتم ترتيبها من خلال BioMobility داخل دولة الإمارات العربية المتحدة.",
//   sections: [
//     {
//       title: "شروط التأجير",
//       items: [
//         "تقبل BioMobility الحجوزات من المقيمين في دولة الإمارات والسياح، بشرط أن يكون عمر العميل 18 سنة أو أكثر وأن يكون مؤهلا قانونيا لإبرام اتفاقية التأجير.",
//         "يتم تأكيد مدة التأجير، وعنوان التوصيل، ونافذة التوصيل، ونوع المعدة، والسعر اليومي، ورسوم التوصيل، وضريبة القيمة المضافة، والمبلغ الإجمالي أثناء الحجز.",
//         "يلتزم العميل باستخدام المعدة فقط لغرض دعم الحركة المخصص لها، ولا يجوز له إعادة تأجيرها أو بيعها أو رهنها أو تعديلها أو إساءة استخدامها.",
//       ],
//     },
//     {
//       title: "نسخة الهوية الإماراتية أو جواز السفر",
//       items: [
//         "تقبل نسخة رقمية من الهوية الإماراتية للمقيمين داخل دولة الإمارات.",
//         "تقبل نسخة رقمية من جواز السفر للسياح والزوار.",
//         "تستخدم نسخة المستند لأغراض التحقق من الحجز والمعالجة الإدارية. ولا يلزم تقديم المستند الأصلي أثناء الحجز الإلكتروني ما لم تطلب BioMobility تحققا إضافيا لسبب معقول.",
//       ],
//     },
//     {
//       title: "مبلغ التأمين",
//       items: [
//         "يستحق مبلغ التأمين القابل للاسترداد عند التوصيل، ولا يتم تحصيله إلكترونيا ما لم يتم الاتفاق على خلاف ذلك بشكل منفصل.",
//         "يطبق مبلغ 500 درهم على الكراسي المتحركة اليدوية، والمشايات، وعربات الأطفال.",
//         "يطبق مبلغ 1000 درهم على الكراسي المتحركة الكهربائية والسكوترات.",
//         "يرد مبلغ التأمين بعد الاستلام والفحص، عادة خلال 24 إلى 72 ساعة، بشرط إعادة المعدة والملحقات بحالة مقبولة.",
//       ],
//     },
//     {
//       title: "رد التأمين والخصومات",
//       items: [
//         "يجوز لشركة BioMobility خصم مبالغ معقولة من التأمين مقابل التلف أو الفقدان أو السرقة أو الملحقات المفقودة أو فقدان الشاحن أو تلف البطارية أو التنظيف الزائد أو التأخر في الإرجاع أو تكاليف الاسترداد أو أي خسائر أخرى تحدث خلال مدة التأجير.",
//         "إذا لم يكن مبلغ التأمين كافيا لتغطية الخسارة، يجوز لشركة BioMobility مطالبة العميل بالمبلغ المتبقي بشكل منفصل.",
//         "لا يعد الاستهلاك الطبيعي الناتج عن الاستخدام الحريص تلفا.",
//       ],
//     },
//     {
//       title: "مسؤولية المعدات",
//       items: [
//         "يتحمل العميل مسؤولية الحفاظ على المعدة من وقت التوصيل حتى وقت الاستلام.",
//         "يجب على العميل فحص المعدة عند التوصيل وإبلاغ BioMobility فورا عن أي مشكلة ظاهرة أو ملحق مفقود أو ملاحظة تتعلق بالسلامة.",
//         "يجب على العميل عدم استخدام أي معدة تبدو غير آمنة، وعليه التواصل مع BioMobility للحصول على الدعم أو إرشادات الاستبدال.",
//       ],
//     },
//     {
//       title: "التوصيل والاستلام",
//       items: [
//         "تعد نوافذ التوصيل والاستلام تقديرية، وقد تتأثر بحركة المرور أو الوصول إلى المبنى أو الطقس أو توفر العميل أو الظروف التشغيلية.",
//         "يلتزم العميل بتقديم تفاصيل موقع دقيقة، وتعليمات وصول واضحة، ورقم هاتف أو واتساب يمكن التواصل عليه.",
//         "قد تطبق رسوم إضافية في حال تعذر التوصيل أو الاستلام، أو كان الموقع بعيدا، أو تم تغيير العنوان، أو حدث انتظار طويل، أو تطلب الأمر زيارات متكررة.",
//       ],
//     },
//     {
//       title: "سياسة الإلغاء",
//       items: [
//         "ينبغي للعميل طلب الإلغاء في أقرب وقت ممكن من خلال دعم BioMobility أو قناة الحجز المتاحة.",
//         "قد تخضع الحجوزات المؤكدة لقيود إلغاء أو تكاليف تجهيز التوصيل أو رسوم معالج الدفع أو أي تكاليف معقولة تم تكبدها فعليا.",
//         "تختلف مدة رد المبالغ بحسب طريقة الدفع والبنك ومعالج الدفع.",
//       ],
//     },
//     {
//       title: "قبول التوقيع الإلكتروني والرقمي",
//       items: [
//         "من خلال إرسال الحجز أو قبول هذه الشروط أو الدفع إلكترونيا أو التأكيد عبر واتساب أو التوقيع عند التوصيل، يوافق العميل على اتفاقية التأجير إلكترونيا.",
//         "يجوز استخدام السجلات الإلكترونية، والقبول الرقمي، وتأكيدات واتساب، والمستندات المرفوعة، والتوقيعات الإلكترونية كدليل على اتفاقية التأجير.",
//       ],
//     },
//     {
//       title: "شروط التواصل مع العميل",
//       items: [
//         "يوافق العميل على أن تتواصل معه BioMobility عبر الهاتف أو واتساب أو الرسائل النصية أو البريد الإلكتروني لأغراض تأكيد الحجز، وتنسيق التوصيل، والدفع، والاستلام، والدعم، ومتابعة التأجير.",
//         "يلتزم العميل بإبقاء بيانات التواصل متاحة خلال مدة التأجير والرد على الاتصالات المعقولة المتعلقة بالتوصيل أو الاستلام أو الدعم.",
//       ],
//     },
//     {
//       title: "القانون الواجب التطبيق في دولة الإمارات",
//       items: [
//         "تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة.",
//         "يجب أولا عرض النزاعات على BioMobility لمحاولة حلها بحسن نية، ثم يجوز إحالتها إلى المحاكم الإماراتية المختصة أو جهة حماية المستهلك عند الاقتضاء.",
//         "لا تحد هذه الشروط من أي حقوق إلزامية مقررة بموجب قوانين حماية المستهلك المعمول بها في دولة الإمارات.",
//       ],
//     },
//   ],
//   drawerSummary: [
//     "تقبل الحجوزات من المقيمين في دولة الإمارات والسياح. يجب أن يكون عمر العميل 18 سنة أو أكثر وأن يقدم نسخة رقمية من الهوية الإماراتية أو جواز السفر.",
//     "يستحق مبلغ التأمين القابل للاسترداد عند التوصيل: 500 درهم للكراسي المتحركة اليدوية والمشايات وعربات الأطفال، و1000 درهم للكراسي المتحركة الكهربائية والسكوترات.",
//     "يرد التأمين بعد الاستلام والفحص، عادة خلال 24 إلى 72 ساعة. وقد تطبق خصومات عند وجود تلف أو فقدان أو سرقة أو ملحقات مفقودة أو شاحن مفقود أو تلف في البطارية أو خسائر أخرى خلال مدة التأجير.",
//     "نوافذ التوصيل والاستلام تقديرية. يجب على العميل تقديم موقع دقيق ورقم هاتف أو واتساب يمكن التواصل عليه.",
//     "من خلال الحجز أو قبول هذه الشروط أو الدفع إلكترونيا أو التأكيد عبر واتساب أو التوقيع عند التوصيل، يوافق العميل على اتفاقية التأجير إلكترونيا.",
//   ],
// };

// export function getTermsContent(locale: string): TermsContent {
//   return locale === "ar" ? arabicTerms : englishTerms;
// }
