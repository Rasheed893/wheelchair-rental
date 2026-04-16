// src/app/[locale]/admin/wheelchairs/new/page.tsx
"use client";

import { useState } from "react";
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
  pricePerDay: z.coerce.number().positive(),
  serialNumber: z.string().min(3),
  images: z.string().min(1), // comma-separated URLs
  weight: z.coerce.number().optional(),
  maxLoad: z.coerce.number().optional(),
  features: z.string().optional(), // comma-separated
  featuresAr: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewWheelchairPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const isAr = locale === "ar";
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { category: "STANDARD" },
  });

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

    const res = await fetch("/api/wheelchairs", {
      method: "POST",
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

  const Field = ({ name, label, type = "text", placeholder = "" }: any) => (
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
          <h1 className="section-heading mb-8">
            {isAr ? "إضافة كرسي جديد" : "Add New Wheelchair"}
          </h1>

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
                placeholder="Lightweight and foldable..."
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
              <Field
                name="pricePerDay"
                label={isAr ? "السعر/يوم ($)" : "Price/Day ($)"}
                type="number"
                placeholder="29.99"
              />
              <Field
                name="serialNumber"
                label={isAr ? "الرقم التسلسلي" : "Serial Number"}
                placeholder="WC-2024-001"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                name="weight"
                label={isAr ? "الوزن (kg)" : "Weight (kg)"}
                type="number"
                placeholder="12"
              />
              <Field
                name="maxLoad"
                label={isAr ? "الحمل الأقصى (kg)" : "Max Load (kg)"}
                type="number"
                placeholder="120"
              />
            </div>

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
                placeholder="https://..., https://..."
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
                  isAr
                    ? "المميزات (إنجليزي، مفصولة بفاصلة)"
                    : "Features EN (comma-separated)"
                }
                placeholder="Foldable, Lightweight"
              />
              <Field
                name="featuresAr"
                label={
                  isAr
                    ? "المميزات (عربي، مفصولة بفاصلة)"
                    : "Features AR (comma-separated)"
                }
                placeholder="قابل للطي, خفيف الوزن"
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
                    ? "حفظ الكرسي"
                    : "Save Wheelchair"}
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
