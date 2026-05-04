import { BASE_URL } from "@/lib/seo";

function cleanAddressPart(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function formatInvoiceFilename(
  invoiceNumber: string,
  issuedAt?: Date | string,
) {
  const normalizedNumber = invoiceNumber.trim();
  if (/^INV-\d{4}-\d+$/i.test(normalizedNumber)) {
    return `${normalizedNumber}.pdf`;
  }

  const year = new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(issuedAt ? new Date(issuedAt) : new Date());

  return `INV-${year}-${normalizedNumber}.pdf`;
}

export function formatInvoiceAddress(address: string) {
  const parts = address
    .split(/\r?\n|,/)
    .map(cleanAddressPart)
    .filter(Boolean)
    .slice(0, 4);

  if (parts.length === 0) {
    return "";
  }

  const [line1, line2, city, country] = parts;
  return [line1, line2, city, country].filter(Boolean).join("\n");
}

export function formatAddressHtml(address: string) {
  return formatInvoiceAddress(address).replace(/\n/g, "<br />");
}

export function buildAbsoluteInvoiceDownloadUrl(downloadPath: string) {
  if (/^https?:\/\//i.test(downloadPath)) {
    return downloadPath;
  }

  const normalizedPath = downloadPath.startsWith("/")
    ? downloadPath
    : `/${downloadPath}`;

  return `${BASE_URL}${normalizedPath}`;
}
