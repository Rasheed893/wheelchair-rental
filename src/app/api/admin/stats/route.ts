// src/app/api/admin/stats/route.ts
import { prisma } from "@/lib/prisma";
import { withAdminAuth, ok, serverError } from "@/lib/middleware";

export const GET = withAdminAuth(async () => {
  try {
    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      revenueResult,
      totalWheelchairs,
      availableWheelchairs,
      totalUsers,
      recentBookings,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCEEDED" },
      }),
      prisma.wheelchair.count(),
      prisma.wheelchair.count({ where: { status: "AVAILABLE" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          wheelchair: true,
          user: { select: { id: true, name: true, email: true } },
          payment: true,
        },
      }),
    ]);

    return ok({
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
      totalWheelchairs,
      availableWheelchairs,
      totalUsers,
      recentBookings,
    });
  } catch (err) {
    return serverError(err);
  }
});
