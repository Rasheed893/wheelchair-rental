// src/app/[locale]/admin/wheelchairs/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/components/layout/AdminSidebar";
import type { Wheelchair } from "@prisma/client";

interface Props {
  params: { locale: string };
}

async function getWheelchairs(): Promise<Wheelchair[]> {
  return prisma.wheelchair.findMany({ orderBy: { createdAt: "desc" } });
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "badge-green",
  MAINTENANCE: "badge-yellow",
  RETIRED: "badge-red",
};

export default async function AdminWheelchairsPage({ params }: Props) {
  const { locale } = params;
  const isAr = locale === "ar";
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/${locale}/dashboard`);

  const wheelchairs = await getWheelchairs();

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-8">
            <h1 className="section-heading">
              {isAr ? "إدارة الكراسي" : "Wheelchair Inventory"}
            </h1>
            <Link
              href={`/${locale}/admin/wheelchairs/new`}
              className="btn-primary"
            >
              {isAr ? "+ إضافة كرسي" : "+ Add Wheelchair"}
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الاسم" : "Name"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الفئة" : "Category"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "السعر/يوم" : "Price/Day"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الرقم التسلسلي" : "Serial No."}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الحالة" : "Status"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {wheelchairs.map((w) => (
                    <tr
                      key={w.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {isAr ? w.nameAr : w.name}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {isAr ? w.name : w.nameAr}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{w.category}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        ${Number(w.pricePerDay).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-xs">
                        {w.serialNumber}
                      </td>
                      <td className="px-5 py-4">
                        <span className={STATUS_BADGE[w.status]}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/${locale}/admin/wheelchairs/${w.id}/edit`}
                          className="text-primary-600 hover:text-primary-800 font-medium text-xs me-3"
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {wheelchairs.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <p>{isAr ? "لا توجد كراسي بعد" : "No wheelchairs yet."}</p>
                  <Link
                    href={`/${locale}/admin/wheelchairs/new`}
                    className="btn-primary mt-4 inline-flex"
                  >
                    {isAr ? "أضف أول كرسي" : "Add First Wheelchair"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
