// src/app/[locale]/auth/reset-password/page.tsx
"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [tokenValid, setTokenValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);

  async function onSubmit(data: FormData) {
    if (!token) return;

    setServerError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setServerError(json.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/auth/login`);
      }, 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (!tokenValid) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="text-4xl text-red-500 mb-4">✗</div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              {isAr ? "رابط غير صحيح" : "Invalid Link"}
            </h1>
            <p className="text-slate-600 text-sm mb-6">
              {isAr
                ? "رابط استعادة كلمة المرور غير صحيح أو منتهي الصلاحية"
                : "The password reset link is invalid or has expired"}
            </p>
            <Link
              href={`/${locale}/auth/forgot-password`}
              className="btn-primary w-full justify-center py-3 inline-block text-center"
            >
              {isAr ? "طلب رابط جديد" : "Request a New Link"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">♿</div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: "var(--font-sora)" }}
          >
            {isAr ? "تعيين كلمة المرور الجديدة" : "Set New Password"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr ? "أدخل كلمة مرور جديدة قوية" : "Enter a strong new password"}
          </p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl text-emerald-600">✓</div>
              <h2 className="text-xl font-semibold text-slate-900">
                {isAr ? "تم تعيين كلمة المرور" : "Password Updated"}
              </h2>
              <p className="text-slate-600 text-sm">
                {isAr
                  ? "سيتم إعادة توجيهك للدخول"
                  : "You will be redirected to login"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isAr ? "كلمة المرور الجديدة" : "New Password"}
                </label>
                <input
                  {...register("newPassword")}
                  type="password"
                  autoComplete="new-password"
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
                </label>
                <input
                  {...register("confirmPassword")}
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  placeholder="••••••••"
                  dir="ltr"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="btn-primary w-full justify-center py-3"
              >
                {isSubmitting || isLoading
                  ? isAr
                    ? "جاري المعالجة..."
                    : "Processing..."
                  : isAr
                    ? "تعيين كلمة المرور"
                    : "Set Password"}
              </button>

              <div className="text-center">
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-primary-600 text-sm font-medium hover:underline"
                >
                  {isAr ? "العودة للدخول" : "Back to Login"}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
