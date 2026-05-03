// src/app/[locale]/admin/users/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { format } from "date-fns";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { bookings: number };
}

export default function AdminUsersPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isAr = locale === "ar";
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data.data);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="section-heading">
                {isAr ? "إدارة المستخدمين" : "Users"}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {total} {isAr ? "عميل مسجل" : "registered customers"}
              </p>
            </div>
            {/* Search */}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAr ? "ابحث بالاسم أو البريد..." : "Search by name or email..."
              }
              className="input-field w-64"
            />
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-start">
                      {isAr ? "المستخدم" : "User"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الهاتف" : "Phone"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "تاريخ التسجيل" : "Registered"}
                    </th>
                    <th className="px-5 py-3 text-start">
                      {isAr ? "الحجوزات" : "Bookings"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading
                    ? [...Array(8)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {[...Array(4)].map((_, j) => (
                            <td key={j} className="px-5 py-4">
                              <div className="h-3 bg-slate-100 rounded w-3/4" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : filtered.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">
                                  {user.name}
                                </div>
                                <div className="text-slate-400 text-xs">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-sm">
                            {user.phone ?? (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-sm">
                            {format(new Date(user.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                user._count.bookings > 0
                                  ? "bg-primary-100 text-primary-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {user._count.bookings}
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>

              {!loading && filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  {isAr ? "لا يوجد مستخدمون" : "No users found"}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline py-1.5 px-3 text-xs disabled:opacity-40"
                >
                  {isAr ? "السابق" : "Prev"}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        p === page
                          ? "bg-primary-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-primary-300"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-outline py-1.5 px-3 text-xs disabled:opacity-40"
                >
                  {isAr ? "التالي" : "Next"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
