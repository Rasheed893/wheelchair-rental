import { prisma } from "@/lib/prisma";
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

function contractDownloadPath(bookingId: string) {
  return `/api/bookings/${bookingId}/rental-contract`;
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
      customerName: booking.user?.name ?? "Customer",
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

    if (!booking.contractPdfUrl) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { contractPdfUrl: contractDownloadPath(booking.id) },
      });
    }

    return {
      bytes,
      filename: `rental-contract-${booking.id}.pdf`,
    };
  }
}

export const rentalContractService = new RentalContractService();
