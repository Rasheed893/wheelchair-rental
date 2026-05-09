import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  BookingWithRelations,
  PaginatedResponse,
  PaginationParams,
} from "@/types";
import type { CreateBookingInput } from "@/validators/booking.validator";
import { wheelchairService } from "./wheelchair.service";
import {
  sendBookingConfirmationEmail,
  sendAdminBookingNotificationEmail,
  sendBookingCancelledEmail,
  sendBookingStatusUpdateEmail,
} from "@/lib/emails/send-booking-confirmation-email";
import {
  CANCELLABLE_BOOKING_STATUSES,
  canTransitionBookingStatus,
} from "@/lib/booking-status";
import { getOptionalEnv } from "@/lib/env";
import {
  getExpiredReservationWhere,
  getReservationExpiryDate,
  getReservationBlockingWhere,
} from "@/lib/booking-reservation";
import { getDeliveryFee } from "@/lib/delivery";
import { calculateBookingPricing } from "@/lib/pricing";
import {
  getCommunicationPriority,
  getCommunicationRisk,
} from "@/lib/communication-risk";

export class BookingService {
  private withCommunicationMetadata<T extends Record<string, unknown>>(booking: T) {
    return {
      ...booking,
      communicationRisk: getCommunicationRisk(
        booking.whatsappNumber as string | null | undefined,
        booking.whatsappVerifiedAt as Date | string | null | undefined,
      ),
      communicationPriority: getCommunicationPriority(
        booking.whatsappVerifiedAt as Date | string | null | undefined,
      ),
    };
  }

  private redactCustomerBooking<T extends Record<string, unknown>>(booking: T) {
    return {
      ...this.withCommunicationMetadata(booking),
      idDocumentUrl: null,
      whatsappOtpHash: null,
      whatsappOtpExpiresAt: null,
      whatsappOtpAttempts: 0,
    };
  }

  async expirePendingBookings(): Promise<number> {
    const MAX_RETRIES = 3;
    const now = new Date();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await prisma.booking.updateMany({
          where: getExpiredReservationWhere(now),
          data: {
            paymentStatus: "EXPIRED",
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: "Reservation expired before payment completion",
          },
        });

        return result.count;
      } catch (err) {
        const isLastAttempt = attempt === MAX_RETRIES;

        if (isLastAttempt) throw err;

        const delay = 2000 * attempt; // 2s → 4s
        logger.warn(
          `[expirePendingBookings] DB connection failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    // Unreachable, but satisfies TypeScript
    return 0;
  }

  async create(
    userId: string,
    input: CreateBookingInput,
  ): Promise<BookingWithRelations> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        whatsappNumber: true,
        whatsappVerifiedAt: true,
      },
    });

    if (!user) {
      throw new Error("Your session is no longer valid. Please sign in again.");
    }

    const wheelchairId = input.wheelchairId.trim();
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (!wheelchairId) {
      throw new Error("Wheelchair ID is required");
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("Invalid booking dates");
    }

    if (startDate >= endDate) {
      throw new Error("End date must be after start date");
    }

    if (!input.termsAccepted) {
      throw new Error("You must accept the Terms & Conditions.");
    }

    const whatsappVerifiedAt =
      user.whatsappNumber === input.whatsappNumber ? user.whatsappVerifiedAt : null;
    const communicationRisk = getCommunicationRisk(
      input.whatsappNumber,
      whatsappVerifiedAt,
    );

    const wheelchair = await wheelchairService.getById(wheelchairId);

    if (!wheelchair) {
      throw new Error("Invalid wheelchair ID");
    }

    const availability = await wheelchairService.getAvailabilitySummary(
      wheelchairId,
      startDate,
      endDate,
    );

    if (availability.availableStock < 1) {
      const supportPhone = getOptionalEnv(
        "NEXT_PUBLIC_SUPPORT_PHONE",
        "support",
      );
      throw new Error(
        "Selected wheelchair is out of stock for those dates Please contact support for assistance at " +
          supportPhone,
      );
    }

    const { days, pricePerDay } = await wheelchairService.calculatePrice(
      wheelchairId,
      startDate,
      endDate,
    );
    const deliveryFee = getDeliveryFee(input.deliveryCity);
    const pricing = calculateBookingPricing(days, pricePerDay, deliveryFee);

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        wheelchairId,
        startDate,
        endDate,
        totalDays: days,
        totalPrice: pricing.total,
        status: input.paymentMethod === "CASH" ? "CONFIRMED" : "PENDING",
        phoneNumber: input.phoneNumber,
        whatsappNumber: input.whatsappNumber,
        whatsappVerifiedAt,
        deliveryCity: input.deliveryCity,
        deliveryWindow: input.deliveryWindow,
        deliveryAddress: input.deliveryAddress,
        deliveryNotes: input.deliveryNotes,
        deliveryFee,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        termsAcceptedAt: new Date(),
        termsVersion: input.termsVersion,
        idDocumentType: input.idDocumentType,
        idDocumentUrl: input.idDocumentUrl,
        idDocumentUploadedAt: new Date(),
        reservationExpiresAt:
          input.paymentMethod === "ONLINE" ? getReservationExpiryDate() : null,
        paidAt: null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        wheelchair: true,
        payment: true,
        invoice: true,
      },
    });

    if (input.fullName !== booking.user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: input.fullName },
      });
      booking.user.name = input.fullName;
    }

    logger.info("[BOOKING] Created booking", {
      bookingId: booking.id,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      customerEmail: booking.user.email,
      communicationRisk,
      communicationPriority: getCommunicationPriority(booking.whatsappVerifiedAt),
    });

    if (input.paymentMethod === "CASH") {
      try {
        await sendBookingConfirmationEmail({
          to: booking.user.email,
          customerName: booking.user.name,
          phoneNumber: booking.phoneNumber,
          deliveryCity: booking.deliveryCity,
          deliveryWindow: booking.deliveryWindow,
          deliveryAddress: booking.deliveryAddress,
          deliveryNotes: booking.deliveryNotes ?? undefined,
          wheelchairName: booking.wheelchair.name,
          startDate: booking.startDate,
          endDate: booking.endDate,
          subtotal: pricing.subtotal,
          deliveryFee: pricing.deliveryFee,
          bookingId: booking.id,
          paymentMethod: "CASH",
          paymentStatus: "PENDING",
        });
      } catch (error) {
        logger.error("[EMAIL ERROR]", {
          bookingId: booking.id,
          error,
        });
      }

      try {
        await sendAdminBookingNotificationEmail({
          to: booking.user.email,
          customerName: booking.user.name,
          phoneNumber: booking.phoneNumber,
          deliveryCity: booking.deliveryCity,
          deliveryWindow: booking.deliveryWindow,
          deliveryAddress: booking.deliveryAddress,
          deliveryNotes: booking.deliveryNotes ?? undefined,
          wheelchairName: booking.wheelchair.name,
          startDate: booking.startDate,
          endDate: booking.endDate,
          subtotal: pricing.subtotal,
          deliveryFee: pricing.deliveryFee,
          bookingId: booking.id,
          paymentMethod: "CASH",
          paymentStatus: "PENDING",
        });
      } catch (error) {
        logger.error("[EMAIL ERROR]", {
          bookingId: booking.id,
          error,
        });
      }
    }

    return this.redactCustomerBooking(
      booking as unknown as Record<string, unknown>,
    ) as unknown as BookingWithRelations;
  }

  async getUserBookings(
    userId: string,
    pagination: PaginationParams = {},
  ): Promise<PaginatedResponse<BookingWithRelations>> {
    await this.expirePendingBookings();

    const { page = 1, pageSize = 10 } = pagination;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId },
        include: { wheelchair: true, payment: true, invoice: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where: { userId } }),
    ]);

    return {
      data: data.map((booking) =>
        this.redactCustomerBooking(booking as unknown as Record<string, unknown>),
      ) as unknown as BookingWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(
    bookingId: string,
    userId?: string,
  ): Promise<BookingWithRelations | null> {
    await this.expirePendingBookings();

    const where = userId ? { id: bookingId, userId } : { id: bookingId };

    const booking = await prisma.booking.findFirst({
      where,
      include: { wheelchair: true, payment: true, invoice: true },
    });

    if (!booking) {
      return null;
    }

    if (userId) {
      return this.redactCustomerBooking(
        booking as unknown as Record<string, unknown>,
      ) as unknown as BookingWithRelations;
    }

    return this.withCommunicationMetadata(
      booking as unknown as Record<string, unknown>,
    ) as unknown as BookingWithRelations;
  }

  async cancel(
    bookingId: string,
    userId: string,
    reason?: string,
    isAdmin = false,
  ): Promise<BookingWithRelations> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) throw new Error("Booking not found");
    if (!isAdmin && booking.userId !== userId) throw new Error("Forbidden");

    if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new Error(`Cannot cancel a booking with status: ${booking.status}`);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        reservationExpiresAt: null,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        wheelchair: true,
        payment: true,
        invoice: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (updated.user?.email) {
      try {
        await sendBookingCancelledEmail({
          to: updated.user.email,
          customerName: updated.user.name,
          bookingId: updated.id,
          supportPhone: getOptionalEnv("NEXT_PUBLIC_SUPPORT_PHONE"),
        });
      } catch (error) {
        logger.error("[EMAIL ERROR]", {
          bookingId: updated.id,
          error,
        });
      }
    }

    if (!isAdmin) {
      return this.redactCustomerBooking(
        updated as unknown as Record<string, unknown>,
      ) as unknown as BookingWithRelations;
    }

    return this.withCommunicationMetadata(
      updated as unknown as Record<string, unknown>,
    ) as unknown as BookingWithRelations;
  }

  async adminList(
    filters: {
      status?: BookingStatus;
      paymentStatus?: "PENDING" | "PAID" | "EXPIRED";
      whatsappVerification?: "VERIFIED" | "NOT_VERIFIED";
      query?: string;
    } = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResponse<BookingWithRelations>> {
    await this.expirePendingBookings();

    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.paymentStatus
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters.whatsappVerification === "VERIFIED"
        ? { whatsappVerifiedAt: { not: null } }
        : {}),
      ...(filters.whatsappVerification === "NOT_VERIFIED"
        ? { whatsappVerifiedAt: null }
        : {}),
      ...(filters.query
        ? {
            OR: [
              { id: { contains: filters.query, mode: "insensitive" as const } },
              {
                user: {
                  email: {
                    contains: filters.query,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          wheelchair: true,
          payment: true,
          invoice: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      data: data.map((booking) =>
        this.withCommunicationMetadata(
          booking as unknown as Record<string, unknown>,
        ),
      ) as unknown as BookingWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminUpdateStatus(bookingId: string, nextStatus: BookingStatus) {
    await this.expirePendingBookings();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        wheelchair: true,
        payment: true,
        invoice: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!canTransitionBookingStatus(booking.status, nextStatus)) {
      throw new Error(
        `Cannot update booking from ${booking.status} to ${nextStatus}`,
      );
    }

    if (
      nextStatus === "CONFIRMED" &&
      booking.paymentMethod === "ONLINE" &&
      booking.paymentStatus !== "PAID"
    ) {
      throw new Error("Cannot confirm unpaid online booking");
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
      include: {
        user: { select: { id: true, name: true, email: true } },
        wheelchair: true,
        payment: true,
        invoice: true,
      },
    });

    if (
      updated.user?.email &&
      (nextStatus === "OUT_FOR_DELIVERY" || nextStatus === "DELIVERED")
    ) {
      try {
        await sendBookingStatusUpdateEmail({
          to: updated.user.email,
          customerName: updated.user.name,
          bookingId: updated.id,
          status: nextStatus,
        });
      } catch (error) {
        logger.error("[EMAIL ERROR]", {
          bookingId: updated.id,
          nextStatus,
          error,
        });
      }
    }

    return this.withCommunicationMetadata(
      updated as unknown as Record<string, unknown>,
    ) as unknown as BookingWithRelations;
  }

  getBlockingReservationWhere(now = new Date()) {
    return getReservationBlockingWhere(now);
  }
}

export const bookingService = new BookingService();
