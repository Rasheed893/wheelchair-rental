import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WheelRent — Wheelchair Rental Service",
  description: "Affordable wheelchair rental for short and long-term needs",
};

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