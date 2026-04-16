// src/app/api/admin/stats/revenue/route.ts
// Returns monthly revenue for the past 12 months (for charts)

import { prisma } from "@/lib/prisma";
import { withAdminAuth, ok, serverError } from "@/lib/middleware";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export const GET = withAdminAuth(async () => {
  try {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      return {
        label: format(date, "MMM yyyy"),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });

    const data = await Promise.all(
      months.map(async ({ label, start, end }) => {
        const result = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: "SUCCEEDED",
            paidAt: { gte: start, lte: end },
          },
        });
        return {
          month: label,
          revenue: Number(result._sum.amount ?? 0),
        };
      }),
    );

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
});
