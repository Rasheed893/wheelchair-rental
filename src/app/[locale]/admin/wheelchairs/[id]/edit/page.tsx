"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import {
  WheelchairForm,
  type WheelchairFormData,
} from "@/components/wheelchair/WheelchairForm";

export default function EditWheelchairPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [defaultValues, setDefaultValues] =
    useState<Partial<WheelchairFormData>>();

  useEffect(() => {
    fetch(`/api/wheelchairs/${id}`)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) {
          setServerError(result.error ?? "Failed to load wheelchair");
          setLoading(false);
          return;
        }

        const wheelchair = result.data;
        setDefaultValues({
          name: wheelchair.name,
          nameAr: wheelchair.nameAr,
          description: wheelchair.description,
          descriptionAr: wheelchair.descriptionAr,
          category: wheelchair.category,
          status: wheelchair.status,
          pricePerDay: Number(wheelchair.pricePerDay),
          stockQuantity: wheelchair.stockQuantity ?? 1,
          serialNumber: wheelchair.serialNumber,
          images: wheelchair.images?.join(", ") ?? "",
          weight: wheelchair.weight ?? undefined,
          maxLoad: wheelchair.maxLoad ?? undefined,
          features: wheelchair.features?.join(", ") ?? "",
          featuresAr: wheelchair.featuresAr?.join(", ") ?? "",
        });
        setLoading(false);
      });
  }, [id]);

  async function onSubmit(data: WheelchairFormData) {
    setServerError(null);
    setSuccessMessage(null);

    const payload = {
      ...data,
      images: data.images
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      features: data.features
        ? data.features
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
      featuresAr: data.featuresAr
        ? data.featuresAr
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    };

    const response = await fetch(`/api/wheelchairs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!result.success) {
      setServerError(result.error ?? "Failed to update product");
      return;
    }

    setSuccessMessage("Product updated successfully.");
    router.push(`/${locale}/admin/wheelchairs`);
  }

  async function handleDelete() {
    const response = await fetch(`/api/wheelchairs/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!result.success) {
      setServerError(result.error ?? "Failed to delete product");
      return;
    }

    router.push(`/${locale}/admin/wheelchairs`);
  }

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="min-w-0 max-w-3xl flex-1">
          <div className="mb-8 flex items-center justify-between gap-3">
            <h1 className="section-heading">Edit Wheelchair</h1>
            <button
              onClick={handleDelete}
              className="btn-danger px-4 py-2 text-sm"
            >
              Delete
            </button>
          </div>

          <div className="card p-8">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <WheelchairForm
                locale={locale}
                isEdit
                defaultValues={defaultValues}
                onSubmit={onSubmit}
                serverError={serverError}
                successMessage={successMessage}
                onCancel={() => router.back()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
