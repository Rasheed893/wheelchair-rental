// src/app/[locale]/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { format } from "date-fns";

interface Props {
  params: { locale: string };
}

async function getStats() {
  const [
    totalBookings,
    confirmedBookings,
    pendingBookings,
    revenue,
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
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        wheelchair: { select: { name: true, nameAr: true } },
        user: { select: { name: true, email: true } },
        payment: { select: { status: true } },
      },
    }),
  ]);

  return {
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalRevenue: Number(revenue._sum.amount ?? 0),
    totalWheelchairs,
    availableWheelchairs,
    totalUsers,
    recentBookings,
  };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-yellow",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-red",
  COMPLETED: "badge-blue",
  EXPIRED: "badge-gray",
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = params;
  const isAr = locale === "ar";
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") redirect(`/${locale}/dashboard`);

  const stats = await getStats();

  const STAT_CARDS = [
    {
      label: isAr ? "إجمالي الحجوزات" : "Total Bookings",
      value: stats.totalBookings,
      color: "text-slate-900",
      icon: "📅",
    },
    {
      label: isAr ? "حجوزات مؤكدة" : "Confirmed Bookings",
      value: stats.confirmedBookings,
      color: "text-emerald-600",
      icon: "✅",
    },
    {
      label: isAr ? "بانتظار الدفع" : "Pending Payment",
      value: stats.pendingBookings,
      color: "text-amber-600",
      icon: "⏳",
    },
    {
      label: isAr ? "إجمالي الإيرادات" : "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      color: "text-primary-700",
      icon: "💰",
    },
    {
      label: isAr ? "إجمالي الكراسي" : "Total Wheelchairs",
      value: stats.totalWheelchairs,
      color: "text-slate-900",
      icon: "♿",
    },
    {
      label: isAr ? "كراسي متاحة" : "Available",
      value: stats.availableWheelchairs,
      color: "text-emerald-600",
      icon: "🟢",
    },
    {
      label: isAr ? "المستخدمون" : "Customers",
      value: stats.totalUsers,
      color: "text-slate-900",
      icon: "👥",
    },
  ];

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0">
          <h1 className="section-heading mb-8">
            {isAr ? "لوحة تحكم الإدارة" : "Admin Dashboard"}
          </h1>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {STAT_CARDS.map((s) => (
              <div key={s.label} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}

            {/* Quick actions card */}
            <div className="card p-5 border-dashed border-primary-200">
              <p className="text-xs font-semibold text-slate-400 mb-3">
                {isAr ? "إجراءات سريعة" : "Quick Actions"}
              </p>
              <Link
                href={`/${locale}/admin/wheelchairs/new`}
                className="btn-primary w-full justify-center py-2 text-xs mb-2"
              >
                {isAr ? "+ إضافة كرسي" : "+ Add Wheelchair"}
              </Link>
              <Link
                href={`/${locale}/admin/bookings`}
                className="btn-outline w-full justify-center py-2 text-xs"
              >
                {isAr ? "كل الحجوزات" : "All Bookings"}
              </Link>
            </div>
          </div>

          {/* Recent bookings table */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                {isAr ? "أحدث الحجوزات" : "Recent Bookings"}
              </h2>
              <Link
                href={`/${locale}/admin/bookings`}
                className="text-sm text-primary-600 hover:underline"
              >
                {isAr ? "عرض الكل" : "View all"}
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-start">
                      {isAr ? "المستخدم" : "User"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الكرسي" : "Wheelchair"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الحالة" : "Status"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "المبلغ" : "Amount"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {booking.user.name}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {booking.user.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {isAr
                          ? booking.wheelchair.nameAr
                          : booking.wheelchair.name}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {format(new Date(booking.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-4">
                        <span className={STATUS_BADGE[booking.status]}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        ${Number(booking.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
