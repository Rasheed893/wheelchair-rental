import { NextResponse } from "next/server";
import {
  getAuthenticatedCloudinaryUrl,
  parseAuthenticatedCloudinaryReference,
} from "@/lib/cloudinary";
import {
  badRequest,
  notFound,
  serverError,
  withAdminAuth,
} from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export const GET = withAdminAuth(async (req, { params }) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      select: { idDocumentUrl: true, idDocumentUploadedAt: true },
    });

    if (!booking?.idDocumentUploadedAt || !booking.idDocumentUrl) {
      return notFound("ID document");
    }

    const parsed = parseAuthenticatedCloudinaryReference(booking.idDocumentUrl);
    if (!parsed) {
      return badRequest("Stored ID document reference is invalid.");
    }

    const disposition = req.nextUrl.searchParams.get("disposition");
    const signedUrl = getAuthenticatedCloudinaryUrl({
      publicId: parsed.publicId,
      resourceType: parsed.resourceType,
      attachment: disposition === "download",
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return serverError(error);
  }
});
