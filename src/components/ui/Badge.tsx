// src/components/ui/Badge.tsx
// ─────────────────────────────────────────────
import clsx from "clsx";

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  green: "badge-green",
  yellow: "badge-yellow",
  red: "badge-red",
  blue: "badge-blue",
  gray: "badge-gray",
};

export function Badge({ variant = "gray", children, className }: BadgeProps) {
  return (
    <span className={clsx(BADGE_VARIANTS[variant], className)}>{children}</span>
  );
}
