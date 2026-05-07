import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatInvoiceAddress } from "@/lib/invoice-format";

type InvoicePdfData = {
  invoiceNumber: string;
  issuedAt: Date;
  bookingId: string;
  customerName: string;
  phoneNumber: string;
  deliveryCity: string;
  deliveryWindow: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  subtotal: number;
  deliveryFee: number;
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
  return process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "WheelRent";
}

function companyVatNumber() {
  return (
    process.env.NEXT_PUBLIC_COMPANY_VAT_NUMBER?.trim() || "VAT not configured"
  );
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

export async function buildInvoicePdf(
  data: InvoicePdfData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBytes = await loadInvoiceFontBytes();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontArabic = await pdf.embedFont(fontBytes.regular, { subset: true });
  const fontArabicBold = await pdf.embedFont(fontBytes.bold, { subset: true });

  const logoBytes = await readFile(
    path.join(process.cwd(), "public", "logo.png"),
  );
  const logoImage = await pdf.embedPng(logoBytes);

  // Scale logo to fit nicely: max 56px tall, proportional width
  const logoDims = logoImage.scaleToFit(250, 70);

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

  const wrapText = (
    value: string,
    maxWidth: number,
    size: number,
    bold = false,
  ) => {
    const font = selectFont(value, bold);
    const lines: string[] = [];
    const paragraphs = value.split("\n");

    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push("");
        continue;
      }

      let currentLine = "";
      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          currentLine = candidate;
          continue;
        }

        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  };

  const drawMultilineValue = (
    value: string,
    options: {
      x: number;
      y: number;
      size: number;
      color: ReturnType<typeof rgb>;
      maxWidth: number;
      lineHeight?: number;
      bold?: boolean;
    },
  ) => {
    const lines = wrapText(
      value,
      options.maxWidth,
      options.size,
      options.bold ?? false,
    );
    const lineHeight = options.lineHeight ?? options.size + 3;

    lines.forEach((line, index) => {
      drawText(line, {
        x: options.x,
        y: options.y - index * lineHeight,
        size: options.size,
        color: options.color,
        bold: options.bold,
      });
    });

    return lines.length;
  };

  const drawRow = (y: number, label: string, value: string) => {
    drawText(label, {
      x: 56,
      y,
      size: 10,
      color: rgb(0.22, 0.28, 0.36),
      bold: true,
    });
    const lines = drawMultilineValue(value, {
      x: 180,
      y,
      size: 10,
      color: rgb(0.07, 0.11, 0.17),
      maxWidth: 340,
      lineHeight: 13,
    });

    return lines;
  };

  // ── Header background ──────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 132,
    width: PAGE_WIDTH,
    height: 132,
    color: rgb(0.95, 0.97, 0.99),
  });

  // ── FIX 1: Logo — properly sized & vertically centred in header ────────────
  // Header spans from PAGE_HEIGHT down to PAGE_HEIGHT-132, centre = PAGE_HEIGHT-66
  const logoX = 40;
  const logoY = PAGE_HEIGHT - 66 - logoDims.height / 2; // vertically centred
  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoDims.width,
    height: logoDims.height,
  });

  // ── FIX 2: Company name — reads from env, NO hardcoded string ─────────────
  // Position it to the right of however wide the logo is
  drawText(`VAT: ${companyVatNumber()}`, {
    x: logoX,
    y: logoY - 14,
    size: 10,
    color: rgb(0.29, 0.33, 0.39),
  });

  // ── Right side: INVOICE label + number + date ──────────────────────────────
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

  // ── Booking details ────────────────────────────────────────────────────────
  drawText("Booking details", {
    x: 56,
    y: PAGE_HEIGHT - 170,
    size: 14,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });

  let y = PAGE_HEIGHT - 198;
  y -= (drawRow(y, "Booking ID", data.bookingId) - 1) * 13;
  y -= 20;
  y -= (drawRow(y, "Customer", data.customerName) - 1) * 13;
  y -= 20;
  y -= (drawRow(y, "Phone", data.phoneNumber) - 1) * 13;
  y -= 20;
  y -= (drawRow(y, "Delivery city", data.deliveryCity) - 1) * 13;
  y -= 20;
  y -= (drawRow(y, "Delivery window", data.deliveryWindow) - 1) * 13;
  y -= 20;
  y -=
    (drawRow(y, "Address", formatInvoiceAddress(data.deliveryAddress)) - 1) *
    13;
  y -= 20;
  if (data.deliveryNotes?.trim()) {
    y -= (drawRow(y, "Customer notes", data.deliveryNotes.trim()) - 1) * 13;
    y -= 20;
  }
  y -= (drawRow(y, "Wheelchair", data.wheelchairName) - 1) * 13;
  y -= 20;
  y -= (drawRow(y, "Rental start", formatDate(data.startDate)) - 1) * 13;
  y -= 20;
  y -= (drawRow(y, "Rental end", formatDate(data.endDate)) - 1) * 13;
  y -= 34;

  // ── Charges ────────────────────────────────────────────────────────────────
  drawText("Charges", {
    x: 56,
    y,
    size: 14,
    color: rgb(0.07, 0.11, 0.17),
    bold: true,
  });
  y -= 18;

  // FIX 3: Increased box height from 108 → 132 so the Total row sits inside.
  // Row positions:  Subtotal @ -16,  Delivery fee @ -42,  VAT @ -68
  // Divider line @ -86,  Total @ -108  → box needs at least 108+16=124px, use 132 for padding.
  const CHARGES_BOX_HEIGHT = 132;

  page.drawRectangle({
    x: 56,
    y: y - CHARGES_BOX_HEIGHT,
    width: PAGE_WIDTH - 112,
    height: CHARGES_BOX_HEIGHT,
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

  drawText("Delivery fee", {
    x: 72,
    y: y - 42,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });
  drawText(formatMoney(data.deliveryFee, data.currency), {
    x: amountX,
    y: y - 42,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });

  drawText(`VAT (${(data.taxRate * 100).toFixed(0)}%)`, {
    x: 72,
    y: y - 68,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });
  drawText(formatMoney(data.taxAmount, data.currency), {
    x: amountX,
    y: y - 68,
    size: 11,
    color: rgb(0.07, 0.11, 0.17),
  });

  // Divider line
  page.drawLine({
    start: { x: 72, y: y - 86 },
    end: { x: PAGE_WIDTH - 72, y: y - 86 },
    color: rgb(0.9, 0.92, 0.95),
    thickness: 1,
  });

  // Total — now comfortably inside the box (box bottom is at y - 132)
  drawText("Total", {
    x: 72,
    y: y - 108,
    size: 12,
    color: rgb(0.06, 0.36, 0.55),
    bold: true,
  });
  drawText(formatMoney(data.totalAmount, data.currency), {
    x: amountX,
    y: y - 108,
    size: 12,
    color: rgb(0.06, 0.36, 0.55),
    bold: true,
  });

  // ── Payment status ─────────────────────────────────────────────────────────
  const statusY = y - CHARGES_BOX_HEIGHT - 46;
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

  // ── Footer ─────────────────────────────────────────────────────────────────
  drawText(`Thank you for choosing ${companyName()}.`, {
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
