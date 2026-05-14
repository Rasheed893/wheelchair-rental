import cloudinary, {
  buildAuthenticatedCloudinaryReference,
  getUserTempIdDocumentPrefix,
  logCloudinaryTarget,
} from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { badRequest, ok, serverError, withCustomerAuth } from "@/lib/middleware";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

const MAX_ID_DOCUMENT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ACCEPTED_DOCUMENT_TYPES = new Set(["EMIRATES_ID", "PASSPORT"]);

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "uploads:id-document", user.id),
      limit: 5,
      windowMs: 60_000,
    });
    if (limited) {
      return limited;
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const documentType = String(formData.get("idDocumentType") ?? "");

    if (!ACCEPTED_DOCUMENT_TYPES.has(documentType)) {
      return badRequest("Select Emirates ID or Passport.");
    }

    if (!(file instanceof File)) {
      return badRequest("ID copy file is required.");
    }

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      return badRequest("Upload a PDF, JPG, PNG, or WEBP file.");
    }

    if (file.size > MAX_ID_DOCUMENT_BYTES) {
      return badRequest("ID copy must be 8MB or smaller.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "application/octet-stream";
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const uploadId = randomUUID();
    const publicId = `${getUserTempIdDocumentPrefix(user.id)}${uploadId}`;
    logCloudinaryTarget({
      publicId,
      resourceType: "auto",
      deliveryType: "authenticated",
    });

    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      resource_type: "auto",
      type: "authenticated",
      tags: ["id-document", documentType.toLowerCase()],
      use_filename: false,
      unique_filename: false,
      overwrite: false,
    });
    logger.info("[ID DOCUMENT UPLOAD] Cloudinary result", {
      public_id: result.public_id,
      resource_type: result.resource_type,
      type: result.type,
      format: result.format,
      version: result.version,
    });

    const deliveryType = result.type || "authenticated";
    const originalFilename =
      result.original_filename || (file.name ? file.name : null);
    const reference = buildAuthenticatedCloudinaryReference({
      resourceType: result.resource_type,
      publicId: result.public_id,
    });

    return ok({
      idDocumentType: documentType,
      uploadedAt: new Date(),
      reference,
      public_id: result.public_id,
      publicId: result.public_id,
      resource_type: result.resource_type,
      resourceType: result.resource_type,
      type: deliveryType,
      deliveryType,
      format: result.format ?? null,
      version:
        result.version === undefined || result.version === null
          ? null
          : String(result.version),
      originalFilename,
    });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
