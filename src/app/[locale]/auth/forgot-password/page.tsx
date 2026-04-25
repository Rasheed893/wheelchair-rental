// src/app/[locale]/auth/forgot-password/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.success) {
        setServerError(json.error);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
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
            {isAr ? "استعادة كلمة المرور" : "Reset Password"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr
              ? "أدخل بريدك الإلكتروني لاستعادة كلمة المرور"
              : "Enter your email to reset your password"}
          </p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl text-emerald-600">✓</div>
              <h2 className="text-xl font-semibold text-slate-900">
                {isAr ? "تم إرسال الرابط" : "Link Sent"}
              </h2>
              <p className="text-slate-600 text-sm">
                {isAr
                  ? "تحقق من بريدك الإلكتروني لرابط استعادة كلمة المرور"
                  : "Check your email for the password reset link"}
              </p>
              <Link
                href={`/${locale}/auth/login`}
                className="btn-primary w-full justify-center py-3 mt-4 inline-block text-center"
              >
                {isAr ? "العودة للدخول" : "Back to Login"}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isAr ? "البريد الإلكتروني" : "Email Address"}
                </label>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  className="input-field"
                  placeholder={isAr ? "example@email.com" : "you@example.com"}
                  dir="ltr"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
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
                disabled={isLoading}
                className="btn-primary w-full justify-center py-3"
              >
                {isLoading
                  ? isAr
                    ? "جاري الإرسال..."
                    : "Sending..."
                  : isAr
                    ? "إرسال رابط استعادة"
                    : "Send Reset Link"}
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
