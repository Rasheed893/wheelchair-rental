// src/components/ui/Card.tsx
// ─────────────────────────────────────────────
import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div className={clsx("card", PADDING[padding], className)}>{children}</div>
  );
}
