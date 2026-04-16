// src/components/wheelchair/WheelchairForm.tsx
// Shared form used by both /admin/wheelchairs/new and /admin/wheelchairs/[id]/edit
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import type { Wheelchair } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2, "Min 2 chars"),
  nameAr: z.string().min(2, "Min 2 chars"),
  description: z.string().min(10, "Min 10 chars"),
  descriptionAr: z.string().min(10, "Min 10 chars"),
  category: z.enum([
    "STANDARD",
    "ELECTRIC",
    "PEDIATRIC",
    "BARIATRIC",
    "TRANSPORT",
  ]),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RETIRED"]).optional(),
  pricePerDay: z.coerce.number().positive("Must be positive"),
  serialNumber: z.string().min(3),
  images: z.string().min(1, "At least one image URL"),
  weight: z.coerce.number().positive().optional(),
  maxLoad: z.coerce.number().positive().optional(),
  features: z.string().optional(),
  featuresAr: z.string().optional(),
});

export type WheelchairFormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<WheelchairFormData>;
  onSubmit: (data: WheelchairFormData) => Promise<void>;
  isEdit?: boolean;
  locale: string;
  serverError?: string | null;
  onCancel?: () => void;
}

export function WheelchairForm({
  defaultValues,
  onSubmit,
  isEdit = false,
  locale,
  serverError,
  onCancel,
}: Props) {
  const isAr = locale === "ar";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WheelchairFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      category: "STANDARD",
      status: "AVAILABLE",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues)
      reset({ category: "STANDARD", status: "AVAILABLE", ...defaultValues });
  }, [defaultValues, reset]);

  const Field = ({
    name,
    label,
    type = "text",
    placeholder = "",
    dir: fDir,
    rows,
  }: {
    name: keyof WheelchairFormData;
    label: string;
    type?: string;
    placeholder?: string;
    dir?: string;
    rows?: number;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {rows ? (
        <textarea
          {...register(name)}
          rows={rows}
          className="input-field resize-none"
          placeholder={placeholder}
          dir={fDir}
        />
      ) : (
        <input
          {...register(name)}
          type={type}
          step={type === "number" ? "0.01" : undefined}
          className="input-field"
          placeholder={placeholder}
          dir={fDir}
        />
      )}
      {errors[name] && (
        <p className="text-red-500 text-xs mt-1">
          {(errors[name] as any)?.message}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Bilingual names */}
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

      {/* Bilingual descriptions */}
      <Field
        name="description"
        label={isAr ? "الوصف (إنجليزي)" : "Description (English)"}
        rows={3}
        placeholder="Lightweight and foldable..."
      />
      <Field
        name="descriptionAr"
        label={isAr ? "الوصف (عربي)" : "Description (Arabic)"}
        rows={3}
        dir="rtl"
      />

      {/* Category, Status, Price */}
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

        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {isAr ? "الحالة" : "Status"}
            </label>
            <select {...register("status")} className="input-field">
              <option value="AVAILABLE">{isAr ? "متاح" : "Available"}</option>
              <option value="MAINTENANCE">
                {isAr ? "صيانة" : "Maintenance"}
              </option>
              <option value="RETIRED">{isAr ? "متقاعد" : "Retired"}</option>
            </select>
          </div>
        )}

        <Field
          name="pricePerDay"
          label={isAr ? "السعر/يوم (AED)" : "Price/Day (AED)"}
          type="number"
          placeholder="29.99"
        />
      </div>

      {/* Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field
          name="serialNumber"
          label={isAr ? "الرقم التسلسلي" : "Serial No."}
          placeholder="WC-2024-001"
        />
        <Field
          name="weight"
          label={isAr ? "الوزن (kg)" : "Weight (kg)"}
          type="number"
          placeholder="12"
        />
        <Field
          name="maxLoad"
          label={isAr ? "الحمل الأقصى" : "Max Load (kg)"}
          type="number"
          placeholder="120"
        />
      </div>

      {/* Images */}
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
          placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
        />
        {errors.images && (
          <p className="text-red-500 text-xs mt-1">{errors.images.message}</p>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field
          name="features"
          label={isAr ? "المميزات (إنجليزي)" : "Features EN"}
          placeholder="Foldable, Lightweight"
        />
        <Field
          name="featuresAr"
          label={isAr ? "المميزات (عربي)" : "Features AR"}
          placeholder="قابل للطي, خفيف الوزن"
          dir="rtl"
        />
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400">
        {isAr
          ? "* الحقول المميزة بـ (مفصولة بفاصلة) يجب أن تكون مفصولة بفاصلة , بين كل قيمة."
          : "* Fields marked (comma-separated) should have values separated by commas."}
      </p>

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
            : isEdit
              ? isAr
                ? "حفظ التغييرات"
                : "Save Changes"
              : isAr
                ? "إضافة الكرسي"
                : "Add Wheelchair"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline px-6">
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        )}
      </div>
    </form>
  );
}
