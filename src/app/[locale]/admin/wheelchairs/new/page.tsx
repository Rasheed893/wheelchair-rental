"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import {
  WheelchairForm,
  type WheelchairFormData,
} from "@/components/wheelchair/WheelchairForm";

export default function NewWheelchairPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    const response = await fetch("/api/wheelchairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!result.success) {
      setServerError(result.error ?? "Failed to create product");
      return;
    }

    setSuccessMessage("Product created successfully.");
    router.push(`/${locale}/admin/wheelchairs`);
  }

  return (
    <div className="page-container py-10">
      <div className="flex gap-8">
        <AdminSidebar locale={locale} />

        <div className="min-w-0 max-w-3xl flex-1">
          <h1 className="section-heading mb-8">Add New Wheelchair</h1>

          <div className="card p-8">
            <WheelchairForm
              locale={locale}
              onSubmit={onSubmit}
              serverError={serverError}
              successMessage={successMessage}
              onCancel={() => router.back()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
