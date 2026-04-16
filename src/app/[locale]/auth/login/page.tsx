// src/app/[locale]/auth/login/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/validators/auth.validator";

export default function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? `/${locale}/dashboard`;

  const [serverError, setServerError] = useState<string | null>(null);

  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (!json.success) {
      setServerError(json.error);
      return;
    }

    login(json.data.user);
    router.push(redirect);
    router.refresh();
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
            {isAr ? "مرحباً بعودتك" : "Welcome Back"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr
              ? "سجّل دخولك لإدارة حجوزاتك"
              : "Sign in to manage your bookings"}
          </p>
        </div>

        <div className="card p-8">
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "كلمة المرور" : "Password"}
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                className="input-field"
                placeholder="••••••••"
                dir="ltr"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
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
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3"
            >
              {isSubmitting
                ? isAr
                  ? "جاري الدخول..."
                  : "Signing in..."
                : isAr
                  ? "تسجيل الدخول"
                  : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isAr ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <Link
              href={`/${locale}/auth/register`}
              className="text-primary-600 font-medium hover:underline"
            >
              {isAr ? "إنشاء حساب" : "Register"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
