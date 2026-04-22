import cloudinary from "@/lib/cloudinary";
import { badRequest, ok, serverError, withAdminAuth } from "@/lib/middleware";

export const POST = withAdminAuth(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return badRequest("Image file is required");
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
