import type { ReactNode } from "react";
import type { Metadata } from "next";
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

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  if (user.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  return <>{children}</>;
}
