import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BookingWithRelations,
  PaginatedResponse,
  PaginationParams,
} from "@/types";
import type { CreateBookingInput } from "@/validators/booking.validator";
import { wheelchairService } from "./wheelchair.service";

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
        status: "PENDING",
        notes: input.notes,
        deliveryAddress: input.deliveryAddress,
      },
      include: {
        wheelchair: true,
        payment: true,
        invoice: true,
      },
    });

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

    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      throw new Error(`Cannot cancel a booking with status: ${booking.status}`);
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: { wheelchair: true, payment: true, invoice: true },
    }) as Promise<BookingWithRelations>;
  }

  async adminList(
    filters: { status?: BookingStatus } = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResponse<BookingWithRelations>> {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;
    const where = filters.status ? { status: filters.status } : {};

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
