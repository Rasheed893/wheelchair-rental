// src/app/[locale]/auth/register/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import {
  registerSchema,
  type RegisterInput,
} from "@/validators/auth.validator";

export default function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const { login } = useAuth();

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    console.log("[REGISTER SUBMIT]", data); // TODO: Remove in production
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log("[REGISTER RESPONSE STATUS]", res.status); // todo: Remove in production
    // console.log("[REGISTER RESPONSE BODY]", await res.text()); // todo: Remove in production
    const json = await res.json();

    if (!json.success) {
      setServerError(json.error);
      return;
    }

    login(json.data.user);
    router.push(`/${locale}/dashboard`);
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
            {isAr ? "إنشاء حساب جديد" : "Create Your Account"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr
              ? "انضم إلينا وابدأ الحجز اليوم"
              : "Join us and start renting today"}
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "الاسم الكامل" : "Full Name"}
              </label>
              <input
                {...register("name")}
                className="input-field"
                placeholder={isAr ? "محمد أحمد" : "John Smith"}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                className="input-field"
                placeholder="you@example.com"
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
                {isAr ? "رقم الهاتف (اختياري)" : "Phone Number (optional)"}
              </label>
              <input
                {...register("phone")}
                type="tel"
                className="input-field"
                placeholder="+1 (555) 000-0000"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isAr ? "كلمة المرور" : "Password"}
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="new-password"
                className="input-field"
                placeholder="••••••••"
                dir="ltr"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? "8 أحرف على الأقل، حرف كبير ورقم"
                  : "Min 8 chars, 1 uppercase, 1 number"}
              </p>
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
                  ? "جاري إنشاء الحساب..."
                  : "Creating account..."
                : isAr
                  ? "إنشاء الحساب"
                  : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isAr ? "لديك حساب بالفعل؟ " : "Already have an account? "}
            <Link
              href={`/${locale}/auth/login`}
              className="text-primary-600 font-medium hover:underline"
            >
              {isAr ? "تسجيل الدخول" : "Sign In"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
