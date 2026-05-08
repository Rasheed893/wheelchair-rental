import { prisma } from "@/lib/prisma";
import { differenceInDays, eachDayOfInterval } from "date-fns";
import type {
  CreateWheelchairInput,
  UpdateWheelchairInput,
} from "@/validators/wheelchair.validator";
import type { PaginationParams, PaginatedResponse } from "@/types";
import type {
  Wheelchair,
  WheelchairCategory,
  WheelchairStatus,
} from "@prisma/client";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { getReservationBlockingWhere } from "@/lib/booking-reservation";
import { generateUniqueWheelchairSlug } from "@/lib/slug";

export interface WheelchairFilters {
  category?: WheelchairCategory;
  status?: WheelchairStatus;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export class WheelchairService {
  async list(
    filters: WheelchairFilters = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResponse<Wheelchair>> {
    const { page = 1, pageSize = 12 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(filters.status
        ? { status: filters.status }
        : { status: "AVAILABLE" as WheelchairStatus }),
      ...(filters.category && { category: filters.category }),
      ...(filters.minPrice !== undefined && {
        pricePerDay: { gte: filters.minPrice },
      }),
      ...(filters.maxPrice !== undefined && {
        pricePerDay: { lte: filters.maxPrice },
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          {
            nameAr: { contains: filters.search, mode: "insensitive" as const },
          },
          {
            description: {
              contains: filters.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.wheelchair.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.wheelchair.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string): Promise<Wheelchair | null> {
    return prisma.wheelchair.findUnique({ where: { id } });
  }

  async getByIdentifier(identifier: string): Promise<Wheelchair | null> {
    return prisma.wheelchair.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
    });
  }

  async create(input: CreateWheelchairInput): Promise<Wheelchair> {
    const slug = await generateUniqueWheelchairSlug(input.name, {
      category: input.category,
    });

    return prisma.wheelchair.create({ data: { ...input, slug } });
  }

  async update(id: string, input: UpdateWheelchairInput): Promise<Wheelchair> {
    const existing = await prisma.wheelchair.findUnique({
      where: { id },
      select: { slug: true, name: true, category: true },
    });

    if (!existing) {
      throw new Error("Wheelchair not found");
    }

    const slug =
      existing.slug ??
      (await generateUniqueWheelchairSlug(input.name ?? existing.name, {
        category: input.category ?? existing.category,
        excludeId: id,
      }));

    return prisma.wheelchair.update({ where: { id }, data: { ...input, slug } });
  }

  async delete(id: string): Promise<void> {
    const activeBookings = await prisma.booking.count({
      where: {
        wheelchairId: id,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    });

    if (activeBookings > 0) {
      throw new Error("Cannot delete wheelchair with active bookings");
    }

    await prisma.wheelchair.delete({ where: { id } });
  }

  async getUnavailableDates(wheelchairId: string): Promise<string[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        wheelchairId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        ...getReservationBlockingWhere(),
        endDate: { gte: new Date() },
      },
      select: { startDate: true, endDate: true },
    });

    const unavailableDates: string[] = [];
    for (const booking of bookings) {
      const days = eachDayOfInterval({
        start: booking.startDate,
        end: booking.endDate,
      });
      unavailableDates.push(...days.map((date) => date.toISOString().split("T")[0]));
    }

    return [...new Set(unavailableDates)];
  }

  async isAvailable(
    wheelchairId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const wheelchair = await prisma.wheelchair.findUnique({
      where: { id: wheelchairId },
      select: { stockQuantity: true },
    });

    if (!wheelchair) {
      return false;
    }

    const overlapCount = await prisma.booking.count({
      where: {
        wheelchairId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        ...getReservationBlockingWhere(),
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });

    return overlapCount < wheelchair.stockQuantity;
  }

  async getAvailabilitySummary(
    wheelchairId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ) {
    const wheelchair = await prisma.wheelchair.findUnique({
      where: { id: wheelchairId },
      select: {
        id: true,
        stockQuantity: true,
        status: true,
      },
    });

    if (!wheelchair) {
      throw new Error("Wheelchair not found");
    }

    const bookedQuantity = await prisma.booking.count({
      where: {
        wheelchairId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        ...getReservationBlockingWhere(),
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });

    return {
      wheelchairId,
      totalStock: wheelchair.stockQuantity,
      bookedQuantity,
      availableStock: Math.max(wheelchair.stockQuantity - bookedQuantity, 0),
      wheelchairStatus: wheelchair.status,
    };
  }

  async listInventorySummary(startDate: Date, endDate: Date) {
    const wheelchairs = await prisma.wheelchair.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      wheelchairs.map(async (wheelchair) => ({
        ...wheelchair,
        inventory: await this.getAvailabilitySummary(
          wheelchair.id,
          startDate,
          endDate,
        ),
      })),
    );
  }

  async calculatePrice(
    wheelchairId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ days: number; pricePerDay: number; totalPrice: number }> {
    const wheelchair = await prisma.wheelchair.findUnique({
      where: { id: wheelchairId },
      select: { pricePerDay: true },
    });

    if (!wheelchair) {
      throw new Error("Wheelchair not found");
    }

    const days = Math.max(1, differenceInDays(endDate, startDate));
    const pricePerDay = Number(wheelchair.pricePerDay);
    const totalPrice = days * pricePerDay;

    return { days, pricePerDay, totalPrice };
  }
}

export const wheelchairService = new WheelchairService();
