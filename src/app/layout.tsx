import type { Metadata } from "next";
import "./globals.css";
import { buildBaseMetadata } from "@/lib/seo";

export const metadata: Metadata = buildBaseMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
