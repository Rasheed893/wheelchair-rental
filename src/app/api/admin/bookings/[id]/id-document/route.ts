import { NextResponse } from "next/server";
import {
  findAuthenticatedResource,
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
import { logger } from "@/lib/logger";

async function verifyCloudinaryResource({
  publicId,
  resourceType,
  deliveryType,
  format,
}: {
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format?: string | null;
}) {
  try {
    const verified = await findAuthenticatedResource({
      publicId,
      resourceType,
      deliveryType,
      format,
    });
    return verified.publicId;
  } catch (error) {
    logger.warn("[ID DOCUMENT] Cloudinary metadata lookup failed", {
      publicId,
      resourceType,
      deliveryType,
      format,
      error,
    });
    return null;
  }
}

export const GET = withAdminAuth(async (req, { params }) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      select: {
        idDocumentUrl: true,
        idDocumentPublicId: true,
        idDocumentResourceType: true,
        idDocumentDeliveryType: true,
        idDocumentFormat: true,
        idDocumentVersion: true,
        idDocumentOriginalFilename: true,
        idDocumentUploadedAt: true,
      },
    });

    if (!booking?.idDocumentUploadedAt) {
      return notFound("ID document");
    }

    const parsed = parseAuthenticatedCloudinaryReference(booking.idDocumentUrl);
    const publicId = booking.idDocumentPublicId || parsed?.publicId;
    const resourceType =
      booking.idDocumentResourceType || parsed?.resourceType;
    const deliveryType =
      booking.idDocumentDeliveryType || parsed?.deliveryType;

    if (!publicId || !resourceType || !deliveryType) {
      return badRequest("Stored ID document reference is invalid.");
    }

    const disposition = req.nextUrl.searchParams.get("disposition");
    const isDownload =
      disposition === "download" || req.nextUrl.pathname.endsWith("/download");
    const exists = await verifyCloudinaryResource({
      publicId,
      resourceType,
      deliveryType,
      format: booking.idDocumentFormat,
    });

    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          error: "ID document was not found in Cloudinary",
        },
        { status: 404 },
      );
    }

    const signedUrl = getAuthenticatedCloudinaryUrl({
      publicId: exists,
      resourceType,
      deliveryType,
      attachment: isDownload,
      expiresInSeconds: 5 * 60,
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return serverError(error);
  }
});
