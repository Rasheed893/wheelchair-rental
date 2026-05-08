// src/app/[locale]/admin/revenue/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { formatAED } from "@/lib/currency";

interface RevenuePoint {
  month: string;
  revenue: number;
}

export default function AdminRevenuePage() {
  const params = useParams();
  const locale = params.locale as string;
  const isAr = locale === "ar";
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats/revenue")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const avgRevenue = data.length ? totalRevenue / data.length : 0;

  return (
    <div className="page-container py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0">
          <h1 className="section-heading mb-8">
            {isAr ? "تقرير الإيرادات" : "Revenue Report"}
          </h1>

          {/* KPIs */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: isAr
                  ? "إجمالي الإيرادات (12 شهر)"
                  : "Total Revenue (12mo)",
                value: formatAED(totalRevenue),
                color: "text-primary-700",
              },
              {
                label: isAr ? "متوسط شهري" : "Monthly Average",
                value: formatAED(avgRevenue),
                color: "text-emerald-700",
              },
              {
                label: isAr ? "أعلى شهر" : "Best Month",
                value: data.length
                  ? formatAED(Math.max(...data.map((d) => d.revenue)))
                  : formatAED(0),
                color: "text-amber-700",
              },
            ].map((stat) => (
              <div key={stat.label} className="card min-w-0 p-5">
                <div className={`mb-1 break-words text-xl font-bold sm:text-2xl ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="break-words text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-6 text-sm">
              {isAr ? "الإيرادات الشهرية" : "Monthly Revenue"}
            </h2>

            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex h-48 min-w-[560px] items-end gap-2">
                  {data.map((point, i) => {
                  const height =
                    maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 flex-1 min-w-[52px] group"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-slate-900 text-white px-2 py-1 rounded whitespace-nowrap">
                        {formatAED(point.revenue)}
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full bg-primary-500 rounded-t-lg transition-all duration-500 hover:bg-primary-600 cursor-pointer"
                        style={{
                          height: `${Math.max(height, point.revenue > 0 ? 4 : 0)}%`,
                          minHeight: point.revenue > 0 ? "4px" : "0",
                        }}
                      />
                      {/* Label */}
                      <span className="text-xs text-slate-400 rotate-45 origin-left translate-x-2 whitespace-nowrap">
                        {point.month.split(" ")[0]}
                      </span>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="text-start py-1 font-medium">
                        {isAr ? "الشهر" : "Month"}
                      </th>
                      <th className="text-end py-1 font-medium">
                        {isAr ? "الإيرادات" : "Revenue"}
                      </th>
                      <th className="text-end py-1 font-medium">
                        {isAr ? "% من الإجمالي" : "% of Total"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...data]
                      .reverse()
                      .slice(0, 6)
                      .map((point, i) => (
                        <tr key={i} className="text-slate-600">
                          <td className="py-1.5">{point.month}</td>
                          <td className="text-end font-semibold">
                            {formatAED(point.revenue)}
                          </td>
                          <td className="text-end text-slate-400">
                            {totalRevenue > 0
                              ? ((point.revenue / totalRevenue) * 100).toFixed(
                                  1,
                                )
                              : "0"}
                            %
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
    </div>
  );
}
