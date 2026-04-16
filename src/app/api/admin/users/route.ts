// src/app/api/admin/users/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth, ok, serverError } from "@/lib/middleware";

export const GET = withAdminAuth(async (req) => {
  try {
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

    return ok({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return serverError(err);
  }
});
