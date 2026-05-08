import type { Metadata } from "next";
import { buildNoIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: buildNoIndexRobots(),
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
