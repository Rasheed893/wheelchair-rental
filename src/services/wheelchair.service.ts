// src/services/wheelchair.service.ts

import { prisma } from "@/lib/prisma";
import { differenceInDays, eachDayOfInterval, parseISO } from "date-fns";
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

export interface WheelchairFilters {
  category?: WheelchairCategory;
  status?: WheelchairStatus;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export class WheelchairService {
  // ─── List with filters & pagination ───────────────────────
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

  // ─── Get by ID ─────────────────────────────────────────────
  async getById(id: string): Promise<Wheelchair | null> {
    return prisma.wheelchair.findUnique({ where: { id } });
  }

  // ─── Create (admin) ────────────────────────────────────────
  async create(input: CreateWheelchairInput): Promise<Wheelchair> {
    return prisma.wheelchair.create({ data: input });
  }

  // ─── Update (admin) ────────────────────────────────────────
  async update(id: string, input: UpdateWheelchairInput): Promise<Wheelchair> {
    return prisma.wheelchair.update({ where: { id }, data: input });
  }

  // ─── Delete (admin) ────────────────────────────────────────
  async delete(id: string): Promise<void> {
    // Only delete if no active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        wheelchairId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    if (activeBookings > 0) {
      throw new Error("Cannot delete wheelchair with active bookings");
    }
    await prisma.wheelchair.delete({ where: { id } });
  }

  // ─── Availability ──────────────────────────────────────────
  async getUnavailableDates(wheelchairId: string): Promise<string[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        wheelchairId,
        status: { in: ["PENDING", "CONFIRMED"] },
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
      unavailableDates.push(...days.map((d) => d.toISOString().split("T")[0]));
    }

    return [...new Set(unavailableDates)];
  }

  // ─── Check range availability ──────────────────────────────
  async isAvailable(
    wheelchairId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const overlap = await prisma.booking.findFirst({
      where: {
        wheelchairId,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        // Overlap condition: start < endDate AND end > startDate
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });

    return overlap === null;
  }

  // ─── Calculate price ───────────────────────────────────────
  async calculatePrice(
    wheelchairId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ days: number; pricePerDay: number; totalPrice: number }> {
    const wheelchair = await prisma.wheelchair.findUnique({
      where: { id: wheelchairId },
      select: { pricePerDay: true },
    });

    if (!wheelchair) throw new Error("Wheelchair not found");

    const days = Math.max(1, differenceInDays(endDate, startDate));
    const pricePerDay = Number(wheelchair.pricePerDay);
    const totalPrice = days * pricePerDay;

    return { days, pricePerDay, totalPrice };
  }
}

export const wheelchairService = new WheelchairService();
