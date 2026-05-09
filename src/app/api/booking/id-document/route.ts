import cloudinary from "@/lib/cloudinary";
import { badRequest, ok, serverError, withCustomerAuth } from "@/lib/middleware";

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

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `wheelchair-rental/id-documents/${user.id}`,
      resource_type: "auto",
      type: "authenticated",
      tags: ["id-document", documentType.toLowerCase()],
    });

    return ok({
      idDocumentType: documentType,
      uploadedAt: new Date(),
      reference: `cloudinary:authenticated:${result.resource_type}:${result.public_id}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
