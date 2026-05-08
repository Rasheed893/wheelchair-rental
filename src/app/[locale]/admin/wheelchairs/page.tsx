import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { formatAED } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { wheelchairService } from "@/services/wheelchair.service";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
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
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setDate(defaultEnd.getDate() + 7);

  const startDate = toDateOrDefault(resolvedSearchParams?.startDate, today);
  const endDate = toDateOrDefault(resolvedSearchParams?.endDate, defaultEnd);

  const wheelchairs = await wheelchairService.listInventorySummary(
    startDate,
    endDate,
  );

  return (
    <div className="page-container py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
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
            <div className="space-y-3 p-4 md:hidden">
              {wheelchairs.map((wheelchair) => (
                <div key={wheelchair.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-medium text-slate-900">
                        {wheelchair.name}
                      </div>
                      <div className="break-all text-xs text-slate-400">
                        {wheelchair.serialNumber}
                      </div>
                    </div>
                    <span className={STATUS_BADGE[wheelchair.status]}>
                      {wheelchair.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-xs text-slate-400">Category</p>
                      <p className="break-words">{wheelchair.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Price/Day</p>
                      <p className="font-semibold text-slate-900">
                        {formatAED(Number(wheelchair.pricePerDay))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total stock</p>
                      <p>{wheelchair.inventory.totalStock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Booked</p>
                      <p>{wheelchair.inventory.bookedQuantity}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">Available</p>
                      <p
                        className={
                          wheelchair.inventory.availableStock > 0
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-red-600"
                        }
                      >
                        {wheelchair.inventory.availableStock}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/${locale}/admin/wheelchairs/${wheelchair.id}/edit`}
                    className="btn-outline mt-4 w-full justify-center py-2 text-xs"
                  >
                    Edit
                  </Link>
                </div>
              ))}

              {wheelchairs.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  No wheelchairs found.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
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
                        <div className="text-xs text-slate-400 break-all">
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
