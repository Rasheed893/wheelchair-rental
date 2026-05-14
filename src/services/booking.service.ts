import { Prisma, type BookingStatus, type DepositDeductionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  AuthUser,
  BookingWithRelations,
  PaginatedResponse,
  PaginationParams,
} from "@/types";
import type { CreateBookingInput } from "@/validators/booking.validator";
import {
  sendBookingConfirmationEmail,
  sendAdminBookingNotificationEmail,
  sendBookingCancelledEmail,
  sendBookingStatusUpdateEmail,
} from "@/lib/emails/send-booking-confirmation-email";
import {
  ACTIVE_BOOKING_STATUSES,
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
  CloudinaryIdDocumentMoveError,
  deleteUserTempIdDocumentUpload,
  isUserTempIdDocumentPublicId,
  moveTempIdDocumentToBookingFolder,
  parseAuthenticatedCloudinaryReference,
} from "@/lib/cloudinary";
import {
  notifyBookingReceived,
  notifyDepositUpdated,
} from "@/lib/booking-notifications";
import { differenceInDays } from "date-fns";

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

type CreatedBooking = Prisma.BookingGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    wheelchair: true;
    payment: true;
    invoice: true;
  };
}>;

type BookingTransactionClient = Prisma.TransactionClient;

export type BookingValidationErrorCode =
  | "OUT_OF_STOCK"
  | "INVALID_DATE"
  | "INVALID_WHEELCHAIR"
  | "WHEELCHAIR_UNAVAILABLE"
  | "TERMS_NOT_ACCEPTED"
  | "INVALID_ID_DOCUMENT";

export class BookingValidationError extends Error {
  constructor(
    public readonly code: BookingValidationErrorCode,
    message: string,
    public readonly status: 400 | 409 = 400,
  ) {
    super(message);
    this.name = "BookingValidationError";
  }
}

const DEPOSIT_TRANSITIONS: Record<string, DepositAction[]> = {
  PENDING: ["deposit-collected"],
  COLLECTED: ["deposit-refunded", "deposit-partially-withheld", "deposit-withheld"],
  REFUNDED: [],
  PARTIALLY_WITHHELD: [],
};

const MAX_CREATE_BOOKING_RETRIES = 3;

export class BookingService {
  async cleanupFailedBookingIdDocumentUpload({
    idDocumentUrl,
    userId,
  }: {
    idDocumentUrl: string;
    userId: string;
  }) {
    try {
      const result = await deleteUserTempIdDocumentUpload({
        reference: idDocumentUrl,
        userId,
      });

      if (result.deleted) {
        logger.info("[ID UPLOAD CLEANUP] deleted orphan upload", {
          userId,
          resourceType: result.resourceType,
          result: result.result,
        });
      }
    } catch (error) {
      logger.error("[ID UPLOAD CLEANUP ERROR]", {
        userId,
        error,
      });
    }
  }

  private async getWheelchairForBooking(
    wheelchairId: string,
    tx?: BookingTransactionClient,
  ) {
    const client = tx ?? prisma;

    return client.wheelchair.findUnique({
      where: { id: wheelchairId },
      select: {
        id: true,
        category: true,
        pricePerDay: true,
        stockQuantity: true,
        status: true,
      },
    });
  }

  private async getBookedQuantityForRange({
    wheelchairId,
    startDate,
    endDate,
    tx,
  }: {
    wheelchairId: string;
    startDate: Date;
    endDate: Date;
    tx?: BookingTransactionClient;
  }) {
    const client = tx ?? prisma;

    return client.booking.count({
      where: {
        wheelchairId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });
  }

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

  private redactIdDocumentLocator<T extends Record<string, unknown>>(booking: T) {
    return {
      ...booking,
      idDocumentUrl: null,
      idDocumentPublicId: null,
      idDocumentResourceType: null,
      idDocumentDeliveryType: null,
      idDocumentFormat: null,
      idDocumentVersion: null,
      idDocumentOriginalFilename: null,
    };
  }

  private redactCustomerBooking<T extends Record<string, unknown>>(booking: T) {
    return this.redactIdDocumentLocator(this.withCommunicationMetadata(booking));
  }

  private redactAdminBooking<T extends Record<string, unknown>>(booking: T) {
    return this.redactIdDocumentLocator(this.withCommunicationMetadata(booking));
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
    const cleanupUploadedIdDocument = async () => {
      await this.cleanupFailedBookingIdDocumentUpload({
        idDocumentUrl: input.idDocumentUrl,
        userId: user.id,
      });
    };

    if (!wheelchairId) {
      await cleanupUploadedIdDocument();
      throw new BookingValidationError(
        "INVALID_WHEELCHAIR",
        "Wheelchair ID is required",
      );
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      await cleanupUploadedIdDocument();
      throw new BookingValidationError(
        "INVALID_DATE",
        "Invalid booking dates",
        409,
      );
    }

    if (startDate >= endDate) {
      await cleanupUploadedIdDocument();
      throw new BookingValidationError(
        "INVALID_DATE",
        "End date must be after start date",
        409,
      );
    }

    if (!input.termsAccepted) {
      await cleanupUploadedIdDocument();
      throw new BookingValidationError(
        "TERMS_NOT_ACCEPTED",
        "You must accept the Terms & Conditions.",
      );
    }

    const parsedIdDocument = parseAuthenticatedCloudinaryReference(
      input.idDocumentUrl,
    );
    const idDocumentPublicId =
      input.idDocumentPublicId?.trim() || parsedIdDocument?.publicId;
    const idDocumentResourceType =
      input.idDocumentResourceType || parsedIdDocument?.resourceType;
    const idDocumentDeliveryType =
      input.idDocumentDeliveryType || parsedIdDocument?.deliveryType;

    if (
      !parsedIdDocument ||
      !idDocumentPublicId ||
      !idDocumentResourceType ||
      !idDocumentDeliveryType ||
      idDocumentPublicId !== parsedIdDocument.publicId ||
      idDocumentResourceType !== parsedIdDocument.resourceType ||
      idDocumentDeliveryType !== parsedIdDocument.deliveryType ||
      !isUserTempIdDocumentPublicId(idDocumentPublicId, user.id)
    ) {
      await cleanupUploadedIdDocument();
      throw new BookingValidationError(
        "INVALID_ID_DOCUMENT",
        "ID copy must be uploaded securely by this account.",
      );
    }

    const communicationRisk = getCommunicationRisk(input.whatsappNumber);
    const deliveryFee = getDeliveryFee(input.deliveryCity);
    const supportPhone = getOptionalEnv("NEXT_PUBLIC_SUPPORT_PHONE", "support");

    let booking: CreatedBooking | null = null;

    for (let attempt = 1; attempt <= MAX_CREATE_BOOKING_RETRIES; attempt++) {
      const started = Date.now();

      try {
        logger.info("[BOOKING] transaction started", {
          userId: user.id,
          wheelchairId,
          attempt,
        });

        booking = await prisma.$transaction(
          async (tx) => {
            const wheelchair = await this.getWheelchairForBooking(
              wheelchairId,
              tx,
            );

            if (!wheelchair) {
              throw new BookingValidationError(
                "INVALID_WHEELCHAIR",
                "Invalid wheelchair ID",
              );
            }

            if (wheelchair.status !== "AVAILABLE") {
              throw new BookingValidationError(
                "WHEELCHAIR_UNAVAILABLE",
                "Selected wheelchair is not available for rental",
                409,
              );
            }

            const bookedQuantity = await this.getBookedQuantityForRange({
              wheelchairId,
              startDate,
              endDate,
              tx,
            });

            if (bookedQuantity >= wheelchair.stockQuantity) {
              throw new BookingValidationError(
                "OUT_OF_STOCK",
                "Selected wheelchair is out of stock for those dates. Please contact support for assistance at " +
                  supportPhone,
                409,
              );
            }

            const totalDays = Math.max(1, differenceInDays(endDate, startDate));
            const pricePerDay = Number(wheelchair.pricePerDay);
            const pricing = calculateBookingPricing(
              totalDays,
              pricePerDay,
              deliveryFee,
            );
            const securityDeposit = getSecurityDeposit(wheelchair.category);

            return tx.booking.create({
              data: {
                userId: user.id,
                wheelchairId,
                startDate,
                endDate,
                totalDays,
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
                idDocumentPublicId,
                idDocumentResourceType,
                idDocumentDeliveryType,
                idDocumentFormat: input.idDocumentFormat ?? null,
                idDocumentVersion: input.idDocumentVersion ?? null,
                idDocumentOriginalFilename:
                  input.idDocumentOriginalFilename ?? null,
                idDocumentUploadedAt: new Date(),
                reservationExpiresAt:
                  input.paymentMethod === "ONLINE"
                    ? getReservationExpiryDate()
                    : null,
                paidAt: null,
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
                wheelchair: true,
                payment: true,
                invoice: true,
              },
            });
          },
          {
            maxWait: 15_000,
            timeout: 15_000,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
        console.log("[BOOKING] tx duration", Date.now() - started);
        logger.info("[BOOKING] transaction committed", {
          bookingId: booking.id,
          userId: user.id,
          wheelchairId,
          attempt,
        });
        break;
      } catch (error) {
        console.log("[BOOKING] tx duration", Date.now() - started);
        if (!(error instanceof BookingValidationError)) {
          logger.error("[BOOKING ERROR] transaction failed", {
            userId: user.id,
            wheelchairId,
            attempt,
            willRetry:
              attempt < MAX_CREATE_BOOKING_RETRIES &&
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2034",
            error,
          });
        }

        if (
          attempt < MAX_CREATE_BOOKING_RETRIES &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034"
        ) {
          continue;
        }

        await this.cleanupFailedBookingIdDocumentUpload({
          idDocumentUrl: input.idDocumentUrl,
          userId: user.id,
        });
        throw error;
      }
    }

    if (!booking) {
      await this.cleanupFailedBookingIdDocumentUpload({
        idDocumentUrl: input.idDocumentUrl,
        userId: user.id,
      });
      throw new Error("Booking could not be created. Please try again.");
    }

    if (input.fullName !== user.name) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: input.fullName },
        });
        booking.user.name = input.fullName;
      } catch (error) {
        logger.error("[BOOKING ERROR] user profile update failed", {
          bookingId: booking.id,
          userId: user.id,
          error,
        });
      }
    }

    if (booking.idDocumentUrl) {
      const customerNameForFolder =
        booking.user.name?.trim() || input.fullName.trim() || "customer";

      logger.info("[ID DOCUMENT] moving temp upload to customer folder", {
        bookingId: booking.id,
        userId: booking.userId,
      });
      logger.info("[ID DOCUMENT] verify source", {
        bookingId: booking.id,
        publicId: booking.idDocumentPublicId,
        resourceType: booking.idDocumentResourceType,
        deliveryType: booking.idDocumentDeliveryType,
        format: booking.idDocumentFormat,
      });

      try {
        const movedDocument = await moveTempIdDocumentToBookingFolder({
          reference: booking.idDocumentUrl,
          userId: booking.userId,
          customerName: customerNameForFolder,
          bookingId: booking.id,
          format: booking.idDocumentFormat,
        });

        const updatedDocumentBooking = await prisma.booking.update({
          where: { id: booking.id },
          data: {
            idDocumentUrl: movedDocument.reference,
            idDocumentPublicId: movedDocument.publicId,
            idDocumentResourceType: movedDocument.resourceType,
            idDocumentDeliveryType: movedDocument.deliveryType,
            idDocumentFormat: movedDocument.format,
            idDocumentVersion: movedDocument.version,
            idDocumentOriginalFilename:
              movedDocument.originalFilename ??
              input.idDocumentOriginalFilename ??
              null,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            wheelchair: true,
            payment: true,
            invoice: true,
          },
        });

        booking = updatedDocumentBooking;
        logger.info("[ID DOCUMENT] moved successfully", {
          bookingId: booking.id,
          userId: booking.userId,
          resourceType: movedDocument.resourceType,
          deliveryType: movedDocument.deliveryType,
        });
      } catch (error) {
        const moveDetails =
          error instanceof CloudinaryIdDocumentMoveError
            ? error.details
            : {};

        logger.error("[ID DOCUMENT ERROR] move failed", {
          bookingId: booking.id,
          userId: booking.userId,
          originalPublicId: moveDetails.originalPublicId,
          targetPublicId: moveDetails.targetPublicId,
          resourceType: moveDetails.resourceType,
          deliveryType: moveDetails.deliveryType,
          cloudinaryMessage: moveDetails.cloudinaryMessage,
          cloudinaryHttpCode: moveDetails.cloudinaryHttpCode,
          step: moveDetails.step,
          error,
        });
      }
    }

    const pricing = calculateBookingPricing(
      booking.totalDays,
      Number(booking.wheelchair.pricePerDay),
      Number(booking.deliveryFee),
    );

    logger.info("[BOOKING] Created booking", {
      bookingId: booking.id,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
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

    return this.redactAdminBooking(
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

    return this.redactAdminBooking(
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

    return this.redactAdminBooking(
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
        this.redactAdminBooking(
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

    return this.redactAdminBooking(
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

    return this.redactAdminBooking(
      updated as unknown as Record<string, unknown>,
    ) as unknown as BookingWithRelations;
  }

  getBlockingReservationWhere(now = new Date()) {
    return getReservationBlockingWhere(now);
  }
}

export const bookingService = new BookingService();
