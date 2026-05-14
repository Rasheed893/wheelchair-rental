import {
  buildIdDocumentReference,
  cleanupAbandonedTempIdDocumentUploads,
  parseAuthenticatedCloudinaryReference,
} from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { ok, serverError, withAdminAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const POST = withAdminAuth(async () => {
  try {
    const attachedDocuments = await prisma.booking.findMany({
      where: {
        idDocumentUrl: {
          startsWith: "cloudinary:authenticated:",
        },
      },
      select: {
        idDocumentUrl: true,
        idDocumentPublicId: true,
        idDocumentResourceType: true,
        idDocumentDeliveryType: true,
      },
    });

    const attachedReferences = new Set(
      attachedDocuments.flatMap((booking) => {
        if (
          booking.idDocumentPublicId &&
          booking.idDocumentResourceType &&
          booking.idDocumentDeliveryType
        ) {
          return [
            buildIdDocumentReference({
              publicId: booking.idDocumentPublicId,
              resourceType: booking.idDocumentResourceType,
              deliveryType: booking.idDocumentDeliveryType,
            }),
          ];
        }

        if (!booking.idDocumentUrl) return [];
        const parsed = parseAuthenticatedCloudinaryReference(
          booking.idDocumentUrl,
        );
        return parsed ? [booking.idDocumentUrl] : [];
      }),
    );

    const result = await cleanupAbandonedTempIdDocumentUploads({
      attachedReferences,
    });

    logger.info("[ID UPLOAD CLEANUP] abandoned temp cleanup completed", {
      deletedCount: result.deleted.length,
      failedCount: result.failed.length,
    });

    return ok({
      deletedCount: result.deleted.length,
      failedCount: result.failed.length,
      deleted: result.deleted,
    });
  } catch (error) {
    logger.error("[ID UPLOAD CLEANUP ERROR]", { error });
    return serverError(error, "Unable to clean up abandoned ID uploads");
  }
});
