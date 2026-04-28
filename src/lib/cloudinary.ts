import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_RAW_UPLOAD_SEGMENT = "/raw/upload/";
const VERSION_SEGMENT_PATTERN = /^v\d+$/;

export function buildInvoicePublicId(year: string, bookingId: string) {
  return `invoices/${year}/${bookingId}`;
}

export function normalizeInvoicePublicId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.replace(/\.pdf$/i, "");
  }

  try {
    const url = new URL(trimmed);
    const uploadIndex = url.pathname.indexOf(CLOUDINARY_RAW_UPLOAD_SEGMENT);
    if (uploadIndex === -1) {
      return null;
    }

    const rawPath = url.pathname
      .slice(uploadIndex + CLOUDINARY_RAW_UPLOAD_SEGMENT.length)
      .split("/")
      .filter(Boolean);

    if (rawPath.length === 0) {
      return null;
    }

    const publicIdSegments = VERSION_SEGMENT_PATTERN.test(rawPath[0])
      ? rawPath.slice(1)
      : rawPath;

    if (publicIdSegments.length === 0) {
      return null;
    }

    return publicIdSegments.join("/").replace(/\.pdf$/i, "");
  } catch {
    return null;
  }
}

export function getInvoiceRawUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    secure: true,
    type: "upload",
    format: "pdf",
    flags: "attachment",
  });
}

export default cloudinary;
