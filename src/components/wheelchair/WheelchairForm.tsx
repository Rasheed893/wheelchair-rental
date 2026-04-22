"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
  stockQuantity: z.coerce.number().int().min(1, "Stock must be at least 1"),
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
  successMessage?: string | null;
  onCancel?: () => void;
}

export function WheelchairForm({
  defaultValues,
  onSubmit,
  isEdit = false,
  locale,
  serverError,
  successMessage,
  onCancel,
}: Props) {
  const isAr = locale === "ar";
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WheelchairFormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      category: "STANDARD",
      status: "AVAILABLE",
      stockQuantity: 1,
      ...defaultValues,
    },
  });

  useEffect(() => {
    const nextValues = {
      category: "STANDARD" as const,
      status: "AVAILABLE" as const,
      stockQuantity: 1,
      ...defaultValues,
    };
    reset(nextValues);

    const nextImages = (nextValues.images ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    setImageUrls(nextImages);
  }, [defaultValues, reset]);

  const imagesValue = watch("images");

  useEffect(() => {
    const nextImages = (imagesValue ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    setImageUrls(nextImages);
  }, [imagesValue]);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error ?? "Upload failed");
      }

      const nextImages = [...imageUrls, payload.data.url];
      setValue("images", nextImages.join(", "), {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeImage(urlToRemove: string) {
    const nextImages = imageUrls.filter((url) => url !== urlToRemove);
    setValue("images", nextImages.join(", "), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

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
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
        <p className="mt-1 text-xs text-red-500">{String(errors[name]?.message)}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          name="name"
          label={isAr ? "Name (English)" : "Name (English)"}
          placeholder="Standard Wheelchair"
        />
        <Field
          name="nameAr"
          label={isAr ? "Name (Arabic)" : "Name (Arabic)"}
          placeholder="كرسي متحرك عادي"
          dir="rtl"
        />
      </div>

      <Field
        name="description"
        label={isAr ? "Description (English)" : "Description (English)"}
        rows={3}
        placeholder="Lightweight and foldable..."
      />
      <Field
        name="descriptionAr"
        label={isAr ? "Description (Arabic)" : "Description (Arabic)"}
        rows={3}
        dir="rtl"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {isAr ? "Category" : "Category"}
          </label>
          <select {...register("category")} className="input-field">
            {[
              "STANDARD",
              "ELECTRIC",
              "PEDIATRIC",
              "BARIATRIC",
              "TRANSPORT",
            ].map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {isAr ? "Status" : "Status"}
            </label>
            <select {...register("status")} className="input-field">
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="RETIRED">RETIRED</option>
            </select>
          </div>
        )}

        <Field
          name="pricePerDay"
          label={isAr ? "Price/Day (AED)" : "Price/Day (AED)"}
          type="number"
          placeholder="29.99"
        />
        <Field
          name="stockQuantity"
          label={isAr ? "Total stock" : "Total stock"}
          type="number"
          placeholder="5"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field
          name="serialNumber"
          label={isAr ? "Serial No." : "Serial No."}
          placeholder="WC-2026-001"
        />
        <Field
          name="weight"
          label={isAr ? "Weight (kg)" : "Weight (kg)"}
          type="number"
          placeholder="12"
        />
        <Field
          name="maxLoad"
          label={isAr ? "Max Load (kg)" : "Max Load (kg)"}
          type="number"
          placeholder="120"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Product Images</p>
            <p className="text-xs text-slate-500">
              Upload to Cloudinary or paste image URLs manually.
            </p>
          </div>
          <label className="btn-outline cursor-pointer px-4 py-2 text-sm">
            {uploading ? "Uploading..." : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Image URLs (comma-separated)
          </label>
          <textarea
            {...register("images")}
            rows={2}
            className="input-field resize-none"
            dir="ltr"
            placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
          />
          {errors.images && (
            <p className="mt-1 text-xs text-red-500">{errors.images.message}</p>
          )}
          {uploadError && (
            <p className="mt-2 text-xs text-red-500">{uploadError}</p>
          )}
        </div>

        {imageUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imageUrls.map((url) => (
              <div
                key={url}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="relative aspect-square">
                  <Image
                    src={url}
                    alt="Wheelchair preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="w-full border-t border-slate-100 px-3 py-2 text-xs font-medium text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          name="features"
          label="Features EN"
          placeholder="Foldable, Lightweight"
        />
        <Field
          name="featuresAr"
          label="Features AR"
          placeholder="قابل للطي, خفيف الوزن"
          dir="rtl"
        />
      </div>

      <p className="text-xs text-slate-400">
        Availability is calculated from overlapping active bookings against total
        stock.
      </p>

      {serverError && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="btn-primary flex-1 justify-center py-3"
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Add Wheelchair"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline px-6">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
