import type { BookingStatus, DepositDeductionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  AuthUser,
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
import { getSecurityDeposit } from "@/lib/security-deposit";
import {
  notifyBookingReceived,
  notifyDepositUpdated,
} from "@/lib/booking-notifications";

type DepositAction =
  | "deposit-collected"
  | "deposit-refunded"
  | "deposit-partially-withheld"
  | "deposit-withheld";

type AdminDepositUpdateInput = {
  action: DepositAction;
  deductionType?: DepositDeductionType;
  reason?: string;
  handledBy?: string;
  withheldAmount?: number;
};

const DEPOSIT_TRANSITIONS: Record<string, DepositAction[]> = {
  PENDING: ["deposit-collected"],
  COLLECTED: ["deposit-refunded", "deposit-partially-withheld", "deposit-withheld"],
  REFUNDED: [],
  PARTIALLY_WITHHELD: [],
};

export class BookingService {
  private withCommunicationMetadata<T extends Record<string, unknown>>(booking: T) {
    return {
      ...booking,
      communicationRisk: getCommunicationRisk(
        booking.whatsappNumber as string | null | undefined,
      ),
      communicationPriority: getCommunicationPriority(
        booking.whatsappNumber as string | null | undefined,
      ),
    };
  }

  private redactCustomerBooking<T extends Record<string, unknown>>(booking: T) {
    return {
      ...this.withCommunicationMetadata(booking),
      idDocumentUrl: null,
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

    const communicationRisk = getCommunicationRisk(input.whatsappNumber);

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
    const securityDeposit = getSecurityDeposit(wheelchair.category);

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
        deliveryCity: input.deliveryCity,
        deliveryWindow: input.deliveryWindow,
        deliveryAddress: input.deliveryAddress,
        deliveryNotes: input.deliveryNotes,
        deliveryFee,
        securityDeposit,
        depositStatus: "PENDING",
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
      communicationPriority: getCommunicationPriority(booking.whatsappNumber),
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

      await notifyBookingReceived({
        bookingId: booking.id,
        whatsappNumber: booking.whatsappNumber,
        securityDeposit: Number(booking.securityDeposit),
      });
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

  async adminGetById(bookingId: string): Promise<BookingWithRelations | null> {
    await this.expirePendingBookings();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        wheelchair: true,
        payment: true,
        invoice: true,
        user: { select: { id: true, name: true, email: true } },
        depositAuditLogs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!booking) {
      return null;
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

  async adminUpdateDeposit(
    bookingId: string,
    input: AdminDepositUpdateInput,
    admin: AuthUser,
  ) {
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

    const oldStatus = booking.depositStatus;
    const allowedActions = DEPOSIT_TRANSITIONS[oldStatus] ?? [];
    if (!allowedActions.includes(input.action)) {
      throw new Error(
        `Cannot run ${input.action} when deposit status is ${oldStatus}.`,
      );
    }

    const now = new Date();
    const actorName = input.handledBy?.trim() || admin.name || admin.email || admin.id;
    const actorEmail = admin.email || null;
    const reason = input.reason?.trim() || undefined;
    const isPartialWithholding =
      input.action === "deposit-partially-withheld" ||
      input.action === "deposit-withheld";
    const securityDeposit = Number(booking.securityDeposit);
    const withheldAmount = Number(input.withheldAmount);
    const refundAmount =
      isPartialWithholding && Number.isFinite(withheldAmount)
        ? securityDeposit - withheldAmount
        : undefined;

    if (isPartialWithholding && !input.deductionType) {
      throw new Error("Deduction type is required when deposit is withheld");
    }

    if (isPartialWithholding && !reason) {
      throw new Error("Deduction reason is required when deposit is withheld");
    }

    if (
      isPartialWithholding &&
      (!Number.isFinite(withheldAmount) ||
        withheldAmount <= 0 ||
        withheldAmount >= securityDeposit)
    ) {
      throw new Error(
        `Withheld amount must be greater than AED 0 and less than ${securityDeposit.toFixed(2)}.`,
      );
    }

    const data =
      input.action === "deposit-collected"
        ? {
            depositStatus: "COLLECTED" as const,
            depositCollectedAt: booking.depositCollectedAt ?? now,
            depositCollectedBy: actorName,
            depositRefundedAt: null,
            depositRefundedBy: null,
            depositDeductionType: null,
            depositDeductionReason: null,
            depositWithheldAmount: null,
            depositRefundAmount: null,
          }
        : input.action === "deposit-refunded"
        ? {
            depositStatus: "REFUNDED" as const,
            depositRefundedAt: now,
            depositRefundedBy: actorName,
            depositDeductionType: null,
            depositDeductionReason: null,
            depositWithheldAmount: null,
            depositRefundAmount: null,
          }
        : {
            depositStatus: "PARTIALLY_WITHHELD" as const,
            depositRefundedAt: now,
            depositRefundedBy: actorName,
            depositDeductionType: input.deductionType,
            depositDeductionReason: reason,
            depositWithheldAmount: withheldAmount,
            depositRefundAmount: refundAmount,
          };

    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.booking.updateMany({
        where: { id: bookingId, depositStatus: oldStatus },
        data,
      });

      if (updateResult.count !== 1) {
        throw new Error("Deposit status changed. Refresh and try again.");
      }

      await tx.depositAuditLog.create({
        data: {
          bookingId,
          action: isPartialWithholding
            ? "deposit-partially-withheld"
            : input.action,
          oldStatus,
          newStatus: data.depositStatus,
          adminId: admin.id,
          actorName,
          actorEmail,
          deductionType: isPartialWithholding ? input.deductionType : null,
          reason: isPartialWithholding ? reason : null,
          withheldAmount: isPartialWithholding ? withheldAmount : null,
          refundAmount: isPartialWithholding ? refundAmount : null,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          wheelchair: true,
          payment: true,
          invoice: true,
          depositAuditLogs: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    await notifyDepositUpdated({
      bookingId: updated.id,
      customerEmail: updated.user?.email,
      customerName: updated.user?.name ?? "Customer",
      whatsappNumber: updated.whatsappNumber,
      securityDeposit: Number(updated.securityDeposit),
      depositStatus: updated.depositStatus as
        | "COLLECTED"
        | "REFUNDED"
        | "PARTIALLY_WITHHELD",
      deductionReason: updated.depositDeductionReason,
      withheldAmount: updated.depositWithheldAmount
        ? Number(updated.depositWithheldAmount)
        : null,
      refundAmount: updated.depositRefundAmount
        ? Number(updated.depositRefundAmount)
        : null,
    });

    return this.withCommunicationMetadata(
      updated as unknown as Record<string, unknown>,
    ) as unknown as BookingWithRelations;
  }

  getBlockingReservationWhere(now = new Date()) {
    return getReservationBlockingWhere(now);
  }
}

export const bookingService = new BookingService();
