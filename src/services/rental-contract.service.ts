import { prisma } from "@/lib/prisma";
import cloudinary, {
  assertCloudinaryPublicId,
  buildBookingAssetPublicId,
  logCloudinaryTarget,
  normalizeInvoicePublicId,
  normalizePdfPublicId,
} from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import {
  buildRentalContractPdf,
  type RentalContractPdfData,
} from "@/lib/rental-contract-pdf";
import {
  formatDeliveryCity,
  formatDeliveryWindow,
  type DeliveryCity,
  type DeliveryWindow,
} from "@/lib/delivery";
import type { AuthUser } from "@/types";

function getBookingCustomerName(userName?: string | null) {
  return userName?.trim() || "customer";
}

function normalizeStoredContractPublicId(value?: string | null) {
  return normalizeInvoicePublicId(value) ?? value?.trim() ?? null;
}

class RentalContractService {
  async generate(
    bookingId: string,
    user: AuthUser,
  ): Promise<{ bytes: Uint8Array; filename: string }> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        wheelchair: { select: { name: true, nameAr: true } },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (user.role !== "ADMIN" && booking.userId !== user.id) {
      throw new Error("Forbidden");
    }

    const data: RentalContractPdfData = {
      bookingId: booking.id,
      customerName: getBookingCustomerName(booking.user?.name),
      contactNumber: booking.whatsappNumber ?? booking.phoneNumber,
      deliveryAddress: booking.deliveryAddress,
      idDocumentType: booking.idDocumentType,
      idCopyReceived: Boolean(booking.idDocumentUploadedAt),
      equipmentName: booking.wheelchair.name,
      startDate: booking.startDate,
      endDate: booking.endDate,
      deliveryCity: formatDeliveryCity(booking.deliveryCity as DeliveryCity),
      deliveryWindow: formatDeliveryWindow(
        booking.deliveryWindow as DeliveryWindow,
      ),
      securityDeposit: Number(booking.securityDeposit),
      depositStatus: booking.depositStatus,
      depositHandledBy: booking.depositCollectedBy ?? booking.depositRefundedBy,
    };

    const bytes = await buildRentalContractPdf(data);

    const expectedPublicId = buildBookingAssetPublicId({
      customerName: getBookingCustomerName(booking.user?.name),
      userId: booking.userId,
      bookingId: booking.id,
      assetName: "rental-contract",
    });
    const storedPublicId = normalizeStoredContractPublicId(booking.contractPdfUrl);

    if (storedPublicId === expectedPublicId && booking.contractPdfUrl !== expectedPublicId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { contractPdfUrl: expectedPublicId },
      });
    }

    if (storedPublicId !== expectedPublicId) {
      try {
        const pdfBuffer = Buffer.from(bytes);

        const uploadResult = await new Promise<{ public_id: string }>(
          (resolve, reject) => {
            logCloudinaryTarget({
              publicId: expectedPublicId,
              resourceType: "raw",
              deliveryType: "upload",
            });

            const stream = cloudinary.uploader.upload_stream(
              {
                resource_type: "raw",
                type: "upload",
                access_mode: "public",
                public_id: expectedPublicId,
                format: "pdf",
                use_filename: false,
                unique_filename: false,
                overwrite: true,
                invalidate: true,
              },
              (error, result) => {
                if (error) {
                  reject(error);
                  return;
                }

                if (!result?.public_id) {
                  reject(
                    new Error(
                      "Cloudinary rental contract upload did not return a public ID",
                    ),
                  );
                  return;
                }

                try {
                  assertCloudinaryPublicId({
                    expectedPublicId,
                    actualPublicId: result.public_id,
                    context: "Rental contract upload",
                    allowPdfExtension: true,
                  });
                } catch (publicIdError) {
                  reject(publicIdError);
                  return;
                }

                resolve({ public_id: normalizePdfPublicId(result.public_id) });
              },
            );

            stream.end(pdfBuffer);
          },
        );

        await prisma.booking.update({
          where: { id: booking.id },
          data: { contractPdfUrl: uploadResult.public_id },
        });
      } catch (error) {
        logger.error("[RENTAL CONTRACT ERROR] Cloudinary upload failed", {
          bookingId: booking.id,
          error,
        });
      }
    }

    return {
      bytes,
      filename: `rental-contract-${booking.id}.pdf`,
    };
  }
}

export const rentalContractService = new RentalContractService();
