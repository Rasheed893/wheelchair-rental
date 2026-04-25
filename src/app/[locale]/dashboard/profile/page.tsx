// src/app/[locale]/dashboard/profile/page.tsx
"use client";

import { use, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .refine((data) => !data.newPassword || data.newPassword.length >= 8, {
    message: "New password must be at least 8 characters",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const { user, loading, login } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, phone: (user as any).phone ?? "" });
    }
  }, [reset, user]);

  if (loading) {
    return (
      <div className="page-container py-10 text-center text-slate-500">
        {isAr ? "جاري التحقق من الجلسة..." : "Verifying session..."}
      </div>
    );
  }

  async function onSubmit(data: FormData) {
    setError(null);
    setSuccess(false);

    try {
      // Handle password change if provided
      if (data.currentPassword && data.newPassword) {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
        });

        const json = await res.json();

        if (!json.success) {
          setError(json.error);
          return;
        }

        // Clear password fields
        reset({ name: data.name, phone: data.phone });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Just update name locally (profile API could be added later)
        const updated = { ...user, name: data.name };
        localStorage.setItem("wr_user", JSON.stringify(updated));
        login(updated as any);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <div className="page-container py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="section-heading mb-8">
          {isAr ? "الملف الشخصي" : "My Profile"}
        </h1>

        {/* Avatar */}
        <div className="card p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span
              className={`badge mt-1 ${user?.role === "ADMIN" ? "badge-blue" : "badge-green"}`}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-5">
            {isAr ? "تعديل المعلومات" : "Edit Information"}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "الاسم الكامل" : "Full Name"}
              </label>
              <input {...register("name")} className="input-field" />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "البريد الإلكتروني" : "Email"}
              </label>
              <input
                value={user?.email ?? ""}
                disabled
                className="input-field opacity-60 cursor-not-allowed"
                dir="ltr"
              />
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? "لا يمكن تغيير البريد الإلكتروني"
                  : "Email cannot be changed"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "رقم الهاتف" : "Phone Number"}
              </label>
              <input
                {...register("phone")}
                type="tel"
                className="input-field"
                dir="ltr"
              />
            </div>

            <hr className="border-slate-100 my-2" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isAr ? "تغيير كلمة المرور" : "Change Password"}
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "كلمة المرور الحالية" : "Current Password"}
              </label>
              <input
                {...register("currentPassword")}
                type="password"
                className="input-field"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "كلمة المرور الجديدة" : "New Password"}
              </label>
              <input
                {...register("newPassword")}
                type="password"
                className="input-field"
                placeholder="••••••••"
                dir="ltr"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">
                ✅ {isAr ? "تم الحفظ بنجاح" : "Profile updated successfully"}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3"
            >
              {isSubmitting
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isAr
                  ? "حفظ التغييرات"
                  : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
