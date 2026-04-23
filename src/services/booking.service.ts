import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BookingWithRelations,
  PaginatedResponse,
  PaginationParams,
} from "@/types";
import type { CreateBookingInput } from "@/validators/booking.validator";
import { wheelchairService } from "./wheelchair.service";
import { invoiceService } from "./invoice.service";
import {
  sendAdminBookingNotificationEmail,
  sendBookingCancelledEmail,
  sendBookingConfirmationEmail,
  sendBookingStatusUpdateEmail,
} from "@/lib/emails/send-booking-confirmation-email";
import {
  CANCELLABLE_BOOKING_STATUSES,
  canTransitionBookingStatus,
} from "@/lib/booking-status";

export class BookingService {
  async create(
    userId: string,
    input: CreateBookingInput,
  ): Promise<BookingWithRelations> {
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
      throw new Error(
        "Selected wheelchair is out of stock for those dates Please contact support for assistance at " +
          process.env.SUPPORT_PHONE,
      );
    }

    const { days, totalPrice } = await wheelchairService.calculatePrice(
      wheelchairId,
      startDate,
      endDate,
    );

    const booking = await prisma.booking.create({
      data: {
        userId,
        wheelchairId,
        startDate,
        endDate,
        totalDays: days,
        totalPrice,
        status: input.paymentMethod === "CASH" ? "CONFIRMED" : "PENDING",
        phoneNumber: input.phoneNumber,
        deliveryAddress: input.deliveryAddress,
        deliveryNotes: input.deliveryNotes,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
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
        where: { id: userId },
        data: { name: input.fullName },
      });
      booking.user.name = input.fullName;
    }

    console.log("[BOOKING] Created booking", {
      bookingId: booking.id,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      customerEmail: booking.user.email,
    });

    try {
      await sendAdminBookingNotificationEmail({
        to: booking.user.email,
        customerName: booking.user.name,
        phoneNumber: booking.phoneNumber,
        deliveryAddress: booking.deliveryAddress,
        deliveryNotes: booking.deliveryNotes ?? undefined,
        wheelchairName: booking.wheelchair.name,
        startDate: booking.startDate,
        endDate: booking.endDate,
        subtotal: Number(booking.totalPrice),
        bookingId: booking.id,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
      });
    } catch (error) {
      console.error("[EMAIL] Admin booking email failed", {
        bookingId: booking.id,
        error,
      });
    }

    if (input.paymentMethod === "CASH") {
      await invoiceService.generate(booking.id, userId);
      try {
        await sendBookingConfirmationEmail({
          to: booking.user.email,
          customerName: booking.user.name,
          phoneNumber: booking.phoneNumber,
          deliveryAddress: booking.deliveryAddress,
          deliveryNotes: booking.deliveryNotes ?? undefined,
          wheelchairName: booking.wheelchair.name,
          startDate: booking.startDate,
          endDate: booking.endDate,
          subtotal: Number(booking.totalPrice),
          bookingId: booking.id,
          paymentMethod: booking.paymentMethod,
          paymentStatus: booking.paymentStatus,
        });
      } catch (error) {
        console.error("[EMAIL] Customer booking confirmation failed", {
          bookingId: booking.id,
          error,
        });
      }
    }

    return booking as BookingWithRelations;
  }

  async getUserBookings(
    userId: string,
    pagination: PaginationParams = {},
  ): Promise<PaginatedResponse<BookingWithRelations>> {
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
      data: data as BookingWithRelations[],
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
    const where = userId ? { id: bookingId, userId } : { id: bookingId };

    return prisma.booking.findFirst({
      where,
      include: { wheelchair: true, payment: true, invoice: true },
    }) as Promise<BookingWithRelations | null>;
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
          supportPhone: process.env.SUPPORT_PHONE,
        });
      } catch (error) {
        console.error("[EMAIL] Booking cancellation email failed", {
          bookingId: updated.id,
          error,
        });
      }
    }

    return updated as unknown as BookingWithRelations;
  }

  async adminList(
    filters: {
      status?: BookingStatus;
      paymentStatus?: "PENDING" | "PAID";
      query?: string;
    } = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResponse<BookingWithRelations>> {
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
      data: data as unknown as BookingWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminUpdateStatus(bookingId: string, nextStatus: BookingStatus) {
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
        console.error("[EMAIL] Booking status update email failed", {
          bookingId: updated.id,
          nextStatus,
          error,
        });
      }
    }

    return updated as unknown as BookingWithRelations;
  }

  async expireStaleBookings(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const result = await prisma.booking.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
        payment: null,
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }
}

export const bookingService = new BookingService();
