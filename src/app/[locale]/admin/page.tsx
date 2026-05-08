// src/app/[locale]/admin/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { format } from "date-fns";
import { formatAED } from "@/lib/currency";

interface Props {
  params: Promise<{ locale: string }>;
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
  const { locale } = await params;
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
      value: formatAED(stats.totalRevenue),
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
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0">
          <h1 className="section-heading mb-8">
            {isAr ? "لوحة تحكم الإدارة" : "Admin Dashboard"}
          </h1>

          {/* Stats grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.map((s) => (
              <div key={s.label} className="card min-w-0 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <div className={`break-words text-xl font-bold sm:text-2xl ${s.color}`}>{s.value}</div>
                <div className="mt-1 break-words text-xs text-slate-400">{s.label}</div>
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
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="space-y-3 p-4 md:hidden">
              {stats.recentBookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-medium text-slate-900">
                        {booking.user.name}
                      </div>
                      <div className="break-all text-xs text-slate-400">
                        {booking.user.email}
                      </div>
                    </div>
                    <span className={STATUS_BADGE[booking.status]}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p className="break-words">
                      {isAr
                        ? booking.wheelchair.nameAr
                        : booking.wheelchair.name}
                    </p>
                    <p>{format(new Date(booking.createdAt), "MMM d, yyyy")}</p>
                    <p className="font-semibold text-slate-900">
                      {formatAED(Number(booking.totalPrice))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
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
                        <div className="text-slate-400 text-xs break-all">
                          {booking.user.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 break-words">
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
                        {formatAED(Number(booking.totalPrice))}
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
