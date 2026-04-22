import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { formatAED } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { wheelchairService } from "@/services/wheelchair.service";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: {
    startDate?: string;
    endDate?: string;
  };
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "badge-green",
  MAINTENANCE: "badge-yellow",
  RETIRED: "badge-red",
};

function toDateOrDefault(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function AdminWheelchairsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setDate(defaultEnd.getDate() + 7);

  const startDate = toDateOrDefault(searchParams?.startDate, today);
  const endDate = toDateOrDefault(searchParams?.endDate, defaultEnd);

  const wheelchairs = await wheelchairService.listInventorySummary(
    startDate,
    endDate,
  );

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="min-w-0 flex-1">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="section-heading">Wheelchair Inventory</h1>
              <p className="mt-2 text-sm text-slate-500">
                Track stock, overlapping bookings, and available chairs by date
                range.
              </p>
            </div>
            <Link
              href={`/${locale}/admin/wheelchairs/new`}
              className="btn-primary"
            >
              + Add Wheelchair
            </Link>
          </div>

          <form className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate.toISOString().slice(0, 10)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                End date
              </label>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate.toISOString().slice(0, 10)}
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="btn-outline w-full justify-center py-3"
              >
                Refresh Availability
              </button>
            </div>
          </form>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Price/Day</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Total stock</th>
                    <th className="px-5 py-3">Booked</th>
                    <th className="px-5 py-3">Available</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wheelchairs.map((wheelchair) => (
                    <tr key={wheelchair.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {wheelchair.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {wheelchair.serialNumber}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {wheelchair.category}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatAED(Number(wheelchair.pricePerDay))}
                      </td>
                      <td className="px-5 py-4">
                        <span className={STATUS_BADGE[wheelchair.status]}>
                          {wheelchair.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {wheelchair.inventory.totalStock}
                      </td>
                      <td className="px-5 py-4">
                        {wheelchair.inventory.bookedQuantity}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            wheelchair.inventory.availableStock > 0
                              ? "font-semibold text-emerald-700"
                              : "font-semibold text-red-600"
                          }
                        >
                          {wheelchair.inventory.availableStock}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/${locale}/admin/wheelchairs/${wheelchair.id}/edit`}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {wheelchairs.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  No wheelchairs found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
