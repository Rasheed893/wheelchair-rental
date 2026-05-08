import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buildNoIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: buildNoIndexRobots(),
};

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/dashboard`);
  }

  return (
    <div>
      <div className="bg-white border-b border-slate-100">
        <div className="page-container">
          <nav className="flex gap-6 py-0 overflow-x-auto">
            {[
              {
                href: `/${locale}/dashboard`,
                label: isAr ? "\u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A" : "My Bookings",
              },
              {
                href: `/${locale}/dashboard/profile`,
                label: isAr
                  ? "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A"
                  : "Profile",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap py-3.5 text-sm font-medium text-slate-500 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
