import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { formatAED } from "@/lib/currency";

export type RentalContractPdfData = {
  bookingId: string;
  customerName: string;
  contactNumber?: string | null;
  deliveryAddress: string;
  idDocumentType?: string | null;
  idCopyReceived: boolean;
  equipmentName: string;
  startDate: Date;
  endDate: Date;
  deliveryCity: string;
  deliveryWindow: string;
  securityDeposit: number;
  depositStatus: string;
  depositHandledBy?: string | null;
};

const FONT_DIRECTORY = path.join(process.cwd(), "public", "fonts");
const REGULAR_FONT_PATH = path.join(
  FONT_DIRECTORY,
  "NotoSansArabic-Regular.ttf",
);
const BOLD_FONT_PATH = path.join(FONT_DIRECTORY, "NotoSansArabic-Bold.ttf");
const LOGO_PATH = path.join(
  process.cwd(),
  "public",
  "branding",
  "invoice-logo-240x60.png",
);

function companyName() {
  return process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "BioMobility";
}

function companyTrn() {
  return process.env.NEXT_PUBLIC_COMPANY_VAT_NUMBER?.trim() || "Not configured";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Dubai",
  }).format(value);
}

function readableIdDocument(value?: string | null) {
  if (value === "EMIRATES_ID") return "Emirates ID";
  if (value === "PASSPORT") return "Passport";
  return "Not provided";
}

function readableIdDocumentAr(value?: string | null) {
  if (value === "EMIRATES_ID") return "الهوية الإماراتية";
  if (value === "PASSPORT") return "جواز السفر";
  return "غير متوفر";
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string | number | null | undefined) {
  return `
    <div class="row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "-")}</dd>
    </div>
  `;
}

function clause(text: string) {
  return `<li>${escapeHtml(text)}</li>`;
}

async function buildContractHtml(data: RentalContractPdfData) {
  const [regularFont, boldFont, logoBytes] = await Promise.all([
    readFile(REGULAR_FONT_PATH),
    readFile(BOLD_FONT_PATH),
    readFile(LOGO_PATH),
  ]);
  const regularFontBase64 = regularFont.toString("base64");
  const boldFontBase64 = boldFont.toString("base64");
  const logoBase64 = logoBytes.toString("base64");
  const deposit = formatAED(data.securityDeposit);
  const dates = `${formatDate(data.startDate)} to ${formatDate(data.endDate)}`;
  const datesAr = `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`;
  const idCopyEnglish = data.idCopyReceived ? "Yes" : "No";
  const idCopyArabic = data.idCopyReceived ? "نعم" : "لا";
  const staffName = data.depositHandledBy ?? "To be completed on delivery";
  const staffNameAr = data.depositHandledBy ?? "يتم استكماله عند التسليم";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: "ContractArabic";
      src: url(data:font/ttf;base64,${regularFontBase64}) format("truetype");
      font-weight: 400;
    }
    @font-face {
      font-family: "ContractArabic";
      src: url(data:font/ttf;base64,${boldFontBase64}) format("truetype");
      font-weight: 700;
    }
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      background: #ffffff;
    }
    .page {
      min-height: 260mm;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .arabic {
      direction: rtl;
      font-family: "ContractArabic", Arial, sans-serif;
      text-align: right;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 2px solid #0f5fa8;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .arabic .header { flex-direction: row-reverse; }
    .logo { width: 150px; height: auto; }
    h1 {
      margin: 10px 0 4px;
      font-size: 25px;
      line-height: 1.1;
      color: #08385c;
    }
    .company {
      color: #475569;
      font-size: 10px;
      white-space: nowrap;
    }
    section { margin-top: 16px; break-inside: avoid; }
    h2 {
      margin: 0 0 8px;
      padding: 6px 9px;
      border-radius: 6px;
      background: #e8f2fb;
      color: #08385c;
      font-size: 13px;
    }
    dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      margin: 0;
    }
    .row {
      min-width: 0;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 7px 8px;
      break-inside: avoid;
    }
    dt {
      margin: 0 0 3px;
      color: #64748b;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .02em;
    }
    .arabic dt {
      letter-spacing: 0;
      text-transform: none;
      font-size: 10px;
    }
    dd {
      margin: 0;
      color: #0f172a;
      font-size: 11px;
      font-weight: 600;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    ul {
      margin: 0;
      padding-inline-start: 18px;
    }
    .arabic ul {
      padding-inline-start: 0;
      padding-inline-end: 18px;
    }
    li {
      margin: 0 0 7px;
      break-inside: avoid;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 24px;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      padding-top: 7px;
      min-height: 34px;
      font-weight: 700;
    }
    .deposit-row {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
  </style>
</head>
<body>
  <main class="page english" dir="ltr">
    <header class="header">
      <div>
        <img class="logo" src="data:image/png;base64,${logoBase64}" alt="BioMobility" />
        <h1>Rental Agreement</h1>
      </div>
      <div class="company">
        <strong>${escapeHtml(companyName())}</strong><br />
        TRN: ${escapeHtml(companyTrn())}
      </div>
    </header>

    <section>
      <h2>Customer Details</h2>
      <dl>
        ${row("Booking ID", data.bookingId)}
        ${row("Customer name", data.customerName)}
        ${row("Contact number", data.contactNumber ?? "Not provided")}
        ${row("Delivery address", data.deliveryAddress)}
        ${row("ID document", readableIdDocument(data.idDocumentType))}
        ${row("ID copy received", idCopyEnglish)}
      </dl>
    </section>

    <section>
      <h2>Rental Details</h2>
      <dl>
        ${row("Equipment", data.equipmentName)}
        ${row("Rental dates", dates)}
        ${row("Delivery city", data.deliveryCity)}
        ${row("Delivery window", data.deliveryWindow)}
        ${row("Security deposit", deposit)}
        ${row("Deposit status", data.depositStatus)}
      </dl>
    </section>

    <section>
      <h2>Legal Clauses</h2>
      <ul>
        ${clause("The customer confirms the equipment is received in working condition and must be used safely and responsibly.")}
        ${clause("The equipment may not be resold, transferred, sub-rented, modified, or used for any unlawful purpose.")}
        ${clause("The customer is liable for damage, theft, charger loss, missing accessories, battery damage, misuse, or loss of the equipment.")}
        ${clause("The security deposit is collected on delivery and is separate from rental charges, VAT, Stripe/COD payments, and invoice totals.")}
        ${clause("The deposit is refunded after pickup and inspection, usually within 24 to 72 hours. Any deduction must be documented.")}
        ${clause("An Emirates ID copy or Passport copy is required and is handled as a sensitive admin-only document.")}
        ${clause("This agreement is governed by UAE law. Disputes are handled first amicably, then by the competent UAE authority or court.")}
      </ul>
    </section>

    <section>
      <h2>Signature Section</h2>
      <div class="signatures">
        <div class="signature-line">Customer signature</div>
        <div class="signature-line">Driver signature</div>
        <div class="signature-line">Date</div>
      </div>
      <div class="deposit-row">
        ${row("Deposit collected amount", deposit)}
        ${row("Driver/admin name", staffName)}
      </div>
    </section>
  </main>

  <main class="page arabic" dir="rtl">
    <header class="header">
      <div>
        <img class="logo" src="data:image/png;base64,${logoBase64}" alt="BioMobility" />
        <h1>اتفاقية تأجير</h1>
      </div>
      <div class="company">
        <strong>${escapeHtml(companyName())}</strong><br />
        الرقم الضريبي: ${escapeHtml(companyTrn())}
      </div>
    </header>

    <section>
      <h2>بيانات العميل</h2>
      <dl>
        ${row("رقم الحجز", data.bookingId)}
        ${row("اسم العميل", data.customerName)}
        ${row("رقم التواصل", data.contactNumber ?? "غير متوفر")}
        ${row("عنوان التوصيل", data.deliveryAddress)}
        ${row("مستند الهوية", readableIdDocumentAr(data.idDocumentType))}
        ${row("تم استلام نسخة الهوية", idCopyArabic)}
      </dl>
    </section>

    <section>
      <h2>تفاصيل التأجير</h2>
      <dl>
        ${row("المعدة", data.equipmentName)}
        ${row("تواريخ التأجير", datesAr)}
        ${row("مدينة التوصيل", data.deliveryCity)}
        ${row("فترة التوصيل", data.deliveryWindow)}
        ${row("مبلغ التأمين", deposit)}
        ${row("حالة التأمين", data.depositStatus)}
      </dl>
    </section>

    <section>
      <h2>الشروط القانونية</h2>
      <ul>
        ${clause("يؤكد العميل استلام المعدة بحالة صالحة للعمل ويلتزم باستخدامها بأمان ومسؤولية.")}
        ${clause("لا يجوز بيع المعدة أو نقلها أو تأجيرها من الباطن أو تعديلها أو استخدامها لأي غرض غير قانوني.")}
        ${clause("يتحمل العميل المسؤولية عن التلف أو السرقة أو فقدان الشاحن أو نقص الملحقات أو تلف البطارية أو سوء الاستخدام أو فقدان المعدة.")}
        ${clause("يتم تحصيل مبلغ التأمين عند التسليم وهو منفصل عن رسوم الإيجار وضريبة القيمة المضافة ومدفوعات Stripe أو الدفع عند الاستلام وإجمالي الفاتورة.")}
        ${clause("يتم رد مبلغ التأمين بعد الاستلام والفحص عادة خلال 24 إلى 72 ساعة. يجب توثيق أي خصم من مبلغ التأمين.")}
        ${clause("يلزم تقديم نسخة من الهوية الإماراتية أو جواز السفر ويتم التعامل معها كمستند حساس مخصص للإدارة فقط.")}
        ${clause("تخضع هذه الاتفاقية لقوانين دولة الإمارات. تتم معالجة النزاعات ودياً أولاً ثم أمام الجهة أو المحكمة المختصة في دولة الإمارات.")}
      </ul>
    </section>

    <section>
      <h2>التواقيع</h2>
      <div class="signatures">
        <div class="signature-line">توقيع العميل</div>
        <div class="signature-line">توقيع السائق</div>
        <div class="signature-line">التاريخ</div>
      </div>
      <div class="deposit-row">
        ${row("مبلغ التأمين المحصل", deposit)}
        ${row("اسم السائق أو المسؤول", staffNameAr)}
      </div>
    </section>
  </main>
</body>
</html>`;
}

export async function buildRentalContractPdf(
  data: RentalContractPdfData,
): Promise<Uint8Array> {
  const browser =
    process.env.NODE_ENV === "production"
      ? await puppeteer.launch({
          args: chromium.args,
          defaultViewport: { width: 1280, height: 720 },
          executablePath: await chromium.executablePath(),
          headless: true,
        })
      : await (await import("puppeteer")).default.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

  try {
    const page = await browser.newPage();
    await page.setContent(await buildContractHtml(data), {
      waitUntil: "load",
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
