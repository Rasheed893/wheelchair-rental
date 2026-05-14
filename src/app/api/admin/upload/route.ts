import cloudinary from "@/lib/cloudinary";
import { badRequest, ok, serverError, withAdminAuth } from "@/lib/middleware";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

const MAX_ADMIN_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const POST = withAdminAuth(async (req, { user }) => {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "uploads:admin", user.id),
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) {
      return limited;
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return badRequest("Image file is required");
    }

    if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
      return badRequest("Upload a JPG, PNG, or WEBP image.");
    }

    if (file.size > MAX_ADMIN_IMAGE_BYTES) {
      return badRequest("Image must be 8MB or smaller.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "wheelchair-rental/admin",
      resource_type: "image",
    });

    return ok({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    return serverError(error);
  }
});
