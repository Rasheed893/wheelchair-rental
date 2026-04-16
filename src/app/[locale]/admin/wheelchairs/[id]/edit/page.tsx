// src/app/[locale]/admin/wheelchairs/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminSidebar from "@/components/layout/AdminSidebar";

const schema = z.object({
  name: z.string().min(2),
  nameAr: z.string().min(2),
  description: z.string().min(10),
  descriptionAr: z.string().min(10),
  category: z.enum([
    "STANDARD",
    "ELECTRIC",
    "PEDIATRIC",
    "BARIATRIC",
    "TRANSPORT",
  ]),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RETIRED"]),
  pricePerDay: z.coerce.number().positive(),
  serialNumber: z.string().min(3),
  images: z.string().min(1),
  weight: z.coerce.number().optional(),
  maxLoad: z.coerce.number().optional(),
  features: z.string().optional(),
  featuresAr: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  params: { locale: string; id: string };
}

export default function EditWheelchairPage({ params }: Props) {
  const { locale, id } = params;
  const isAr = locale === "ar";
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any, // ✅ quick fix
    defaultValues: { category: "STANDARD" },
  });

  // Load existing wheelchair data
  useEffect(() => {
    fetch(`/api/wheelchairs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const w = data.data;
          reset({
            name: w.name,
            nameAr: w.nameAr,
            description: w.description,
            descriptionAr: w.descriptionAr,
            category: w.category,
            status: w.status,
            pricePerDay: Number(w.pricePerDay),
            serialNumber: w.serialNumber,
            images: w.images?.join(", ") ?? "",
            weight: w.weight ?? undefined,
            maxLoad: w.maxLoad ?? undefined,
            features: w.features?.join(", ") ?? "",
            featuresAr: w.featuresAr?.join(", ") ?? "",
          });
        }
        setLoading(false);
      });
  }, [id, reset]);

  async function onSubmit(data: FormData) {
    setServerError(null);
    const payload = {
      ...data,
      images: data.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      features: data.features
        ? data.features
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      featuresAr: data.featuresAr
        ? data.featuresAr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    const res = await fetch(`/api/wheelchairs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) {
      setServerError(json.error);
      return;
    }
    router.push(`/${locale}/admin/wheelchairs`);
  }

  async function handleDelete() {
    const res = await fetch(`/api/wheelchairs/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      setServerError(json.error);
      return;
    }
    router.push(`/${locale}/admin/wheelchairs`);
  }

  if (loading) {
    return (
      <div className="page-container py-10">
        <div className="flex gap-8">
          <AdminSidebar locale={locale} />
          <div className="flex-1 animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const Field = ({
    name,
    label,
    type = "text",
    placeholder = "",
    dir: fieldDir,
  }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        {...register(name)}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        className="input-field"
        placeholder={placeholder}
        dir={fieldDir}
      />
      {errors[name as keyof FormData] && (
        <p className="text-red-500 text-xs mt-1">
          {(errors[name as keyof FormData] as any)?.message}
        </p>
      )}
    </div>
  );

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="flex-1 min-w-0 max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="section-heading">
              {isAr ? "تعديل الكرسي" : "Edit Wheelchair"}
            </h1>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="btn-danger py-2 px-4 text-sm"
            >
              {isAr ? "🗑 حذف" : "🗑 Delete"}
            </button>
          </div>

          {/* Delete confirmation modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="font-bold text-slate-900 mb-2">
                  {isAr ? "تأكيد الحذف" : "Confirm Delete"}
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  {isAr
                    ? "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء."
                    : "Are you sure? This action cannot be undone. Wheelchairs with active bookings cannot be deleted."}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="btn-danger flex-1 justify-center"
                  >
                    {isAr ? "نعم، احذف" : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="btn-outline flex-1 justify-center"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="card p-8 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                name="name"
                label={isAr ? "الاسم (إنجليزي)" : "Name (English)"}
                placeholder="Standard Wheelchair"
              />
              <Field
                name="nameAr"
                label={isAr ? "الاسم (عربي)" : "Name (Arabic)"}
                placeholder="كرسي متحرك عادي"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "الوصف (إنجليزي)" : "Description (English)"}
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="input-field resize-none"
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "الوصف (عربي)" : "Description (Arabic)"}
              </label>
              <textarea
                {...register("descriptionAr")}
                rows={3}
                className="input-field resize-none"
                dir="rtl"
              />
              {errors.descriptionAr && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.descriptionAr.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isAr ? "الفئة" : "Category"}
                </label>
                <select {...register("category")} className="input-field">
                  {[
                    "STANDARD",
                    "ELECTRIC",
                    "PEDIATRIC",
                    "BARIATRIC",
                    "TRANSPORT",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isAr ? "الحالة" : "Status"}
                </label>
                <select {...register("status")} className="input-field">
                  <option value="AVAILABLE">
                    {isAr ? "متاح" : "Available"}
                  </option>
                  <option value="MAINTENANCE">
                    {isAr ? "صيانة" : "Maintenance"}
                  </option>
                  <option value="RETIRED">{isAr ? "متقاعد" : "Retired"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field
                name="pricePerDay"
                label={isAr ? "السعر/يوم ($)" : "Price/Day ($)"}
                type="number"
              />
              <Field
                name="weight"
                label={isAr ? "الوزن (kg)" : "Weight (kg)"}
                type="number"
              />
              <Field
                name="maxLoad"
                label={isAr ? "الحمل الأقصى" : "Max Load (kg)"}
                type="number"
              />
            </div>

            <Field
              name="serialNumber"
              label={isAr ? "الرقم التسلسلي" : "Serial Number"}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr
                  ? "روابط الصور (مفصولة بفاصلة)"
                  : "Image URLs (comma-separated)"}
              </label>
              <textarea
                {...register("images")}
                rows={2}
                className="input-field resize-none"
                dir="ltr"
              />
              {errors.images && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.images.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                name="features"
                label={
                  isAr ? "المميزات (إنجليزي)" : "Features EN (comma-separated)"
                }
              />
              <Field
                name="featuresAr"
                label={
                  isAr ? "المميزات (عربي)" : "Features AR (comma-separated)"
                }
                dir="rtl"
              />
            </div>

            {serverError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                {serverError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 justify-center py-3"
              >
                {isSubmitting
                  ? isAr
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isAr
                    ? "حفظ التغييرات"
                    : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-outline px-6"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
