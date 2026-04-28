import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type InvoicePdfData = {
  invoiceNumber: string;
  issuedAt: Date;
  bookingId: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const ARABIC_TEXT_PATTERN = /[\u0600-\u06FF]/;
const FONT_DIRECTORY = path.join(process.cwd(), "public", "fonts");
const REGULAR_FONT_PATH = path.join(
  FONT_DIRECTORY,
  "NotoSansArabic-Regular.ttf",
);
const BOLD_FONT_PATH = path.join(FONT_DIRECTORY, "NotoSansArabic-Bold.ttf");

let invoiceFontBytesPromise:
  | Promise<{ regular: Uint8Array; bold: Uint8Array }>
  | undefined;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Dubai",
  }).format(value);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function companyName() {
  return process.env.COMPANY_NAME?.trim() || "WheelRent";
}

function companyVatNumber() {
  return process.env.COMPANY_VAT_NUMBER?.trim() || "VAT not configured";
}

async function loadInvoiceFontBytes() {
  if (!invoiceFontBytesPromise) {
    invoiceFontBytesPromise = Promise.all([
      readFile(REGULAR_FONT_PATH),
      readFile(BOLD_FONT_PATH),
    ]).then(([regular, bold]) => ({
      regular: new Uint8Array(regular),
      bold: new Uint8Array(bold),
    }));
  }

  return invoiceFontBytesPromise;
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBytes = await loadInvoiceFontBytes();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontArabic = await pdf.embedFont(fontBytes.regular, { subset: true });
  const fontArabicBold = await pdf.embedFont(fontBytes.bold, { subset: true });

  const selectFont = (value: string, bold = false) => {
    if (ARABIC_TEXT_PATTERN.test(value)) {
      return bold ? fontArabicBold : fontArabic;
    }

    return bold ? fontBold : fontRegular;
  };

  const drawText = (
    value: string,
    options: {
      x: number;
      y: number;
      size: number;
      color: ReturnType<typeof rgb>;
      bold?: boolean;
    },
  ) => {
    page.drawText(value, {
      ...options,
      font: selectFont(value, options.bold),
    });
  };

  const drawRow = (y: number, label: string, value: string) => {
    drawText(label, {
      x: 56,
      y,
      size: 10,
      color: rgb(0.22, 0.28, 0.36),
      bold: true,
    });
    drawText(value, {
      x: 180,
      y,
      size: 10,
      color: rgb(0.07, 0.11, 0.17),
    });
  };

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 132,
    width: PAGE_WIDTH,
    height: 132,
    color: rgb(0.95, 0.97, 0.99),
  });

  page.drawRectangle({
    x: 56,
    y: PAGE_HEIGHT - 98,
    width: 52,
    height: 52,
    color: rgb(0.06, 0.36, 0.55),
    borderColor: rgb(0.04, 0.28, 0.43),
    borderWidth: 1,
  });
  drawText("WR", {
    x: 67,
    y: PAGE_HEIGHT - 80,
    size: 19,
    color: rgb(1, 1, 1),
    bold: true,
  });

  drawText(companyName(), {
    x: 122,
    y: PAGE_HEIGHT - 66,
    size: 22,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });
  drawText(`VAT: ${companyVatNumber()}`, {
    x: 122,
    y: PAGE_HEIGHT - 88,
    size: 10,
    color: rgb(0.29, 0.33, 0.39),
  });

  drawText("INVOICE", {
    x: 420,
    y: PAGE_HEIGHT - 62,
    size: 20,
    color: rgb(0.06, 0.36, 0.55),
    bold: true,
  });
  drawText(data.invoiceNumber, {
    x: 390,
    y: PAGE_HEIGHT - 86,
    size: 12,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });
  drawText(`Issue date: ${formatDate(data.issuedAt)}`, {
    x: 390,
    y: PAGE_HEIGHT - 104,
    size: 10,
    color: rgb(0.29, 0.33, 0.39),
  });

  drawText("Booking details", {
    x: 56,
    y: PAGE_HEIGHT - 170,
    size: 14,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });

  let y = PAGE_HEIGHT - 198;
  drawRow(y, "Booking ID", data.bookingId);
  y -= 20;
  drawRow(y, "Customer", data.customerName);
  y -= 20;
  drawRow(y, "Phone", data.phoneNumber);
  y -= 20;
  drawRow(y, "Address", data.deliveryAddress);
  y -= 20;
  if (data.deliveryNotes?.trim()) {
    drawRow(y, "Customer notes", data.deliveryNotes.trim());
    y -= 20;
  }
  drawRow(y, "Wheelchair", data.wheelchairName);
  y -= 20;
  drawRow(y, "Rental start", formatDate(data.startDate));
  y -= 20;
  drawRow(y, "Rental end", formatDate(data.endDate));
  y -= 34;

  drawText("Charges", {
    x: 56,
    y,
    size: 14,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });
  y -= 18;

  page.drawRectangle({
    x: 56,
    y: y - 92,
    width: PAGE_WIDTH - 112,
    height: 108,
    borderColor: rgb(0.85, 0.89, 0.93),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const amountX = 468;
  drawText("Subtotal", {
    x: 72,
    y: y - 16,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });
  drawText(formatMoney(data.subtotal, data.currency), {
    x: amountX,
    y: y - 16,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });

  drawText(`VAT (${(data.taxRate * 100).toFixed(0)}%)`, {
    x: 72,
    y: y - 42,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });
  drawText(formatMoney(data.taxAmount, data.currency), {
    x: amountX,
    y: y - 42,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });

  page.drawLine({
    start: { x: 72, y: y - 56 },
    end: { x: PAGE_WIDTH - 72, y: y - 56 },
    color: rgb(0.9, 0.92, 0.95),
    thickness: 1,
  });

  drawText("Total", {
    x: 72,
    y: y - 78,
    size: 12,
    color: rgb(0.06, 0.36, 0.55),
    bold: true,
  });
  drawText(formatMoney(data.totalAmount, data.currency), {
    x: amountX,
    y: y - 78,
    size: 12,
    color: rgb(0.06, 0.36, 0.55),
    bold: true,
  });

  const statusY = y - 132;
  drawText("Payment status", {
    x: 56,
    y: statusY,
    size: 14,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });
  page.drawRectangle({
    x: 56,
    y: statusY - 34,
    width: 76,
    height: 24,
    color: rgb(0.91, 0.97, 0.93),
    borderColor: rgb(0.39, 0.71, 0.47),
    borderWidth: 1,
  });
  drawText("PAID", {
    x: 79,
    y: statusY - 26,
    size: 11,
    color: rgb(0.17, 0.48, 0.23),
    bold: true,
  });

  drawText("Thank you for choosing WheelRent.", {
    x: 56,
    y: 72,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });
  drawText(
    "This invoice was generated automatically after payment confirmation.",
    {
      x: 56,
      y: 54,
      size: 9,
      color: rgb(0.38, 0.43, 0.5),
    },
  );

  return pdf.save();
}
