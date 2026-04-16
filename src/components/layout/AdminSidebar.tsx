// src/components/layout/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

interface Props {
  locale: string;
}

export default function AdminSidebar({ locale }: Props) {
  const pathname = usePathname();
  const isAr = locale === "ar";

  const links = [
    {
      href: `/${locale}/admin`,
      label: isAr ? "لوحة التحكم" : "Dashboard",
      icon: "📊",
      exact: true,
    },
    {
      href: `/${locale}/admin/wheelchairs`,
      label: isAr ? "الكراسي" : "Wheelchairs",
      icon: "♿",
      exact: false,
    },
    {
      href: `/${locale}/admin/bookings`,
      label: isAr ? "الحجوزات" : "Bookings",
      icon: "📅",
      exact: false,
    },
    {
      href: `/${locale}/admin/users`,
      label: isAr ? "المستخدمون" : "Users",
      icon: "👥",
      exact: false,
    },
    {
      href: `/${locale}/admin/revenue`,
      label: isAr ? "الإيرادات" : "Revenue",
      icon: "💰",
      exact: false,
    },
  ];

  return (
    <aside className="w-64 shrink-0">
      <div className="card p-3 sticky top-20">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          {isAr ? "الإدارة" : "Admin Panel"}
        </p>
        <nav className="space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
