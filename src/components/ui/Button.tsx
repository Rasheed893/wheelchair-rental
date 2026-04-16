// src/components/ui/Button.tsx
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS = {
  primary: "btn-primary",
  outline: "btn-outline",
  danger: "btn-danger",
  ghost:
    "text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl px-3 py-2 transition-colors text-sm font-medium",
};

const SIZES = {
  sm: "py-1.5 px-3 text-xs",
  md: "py-2.5 px-5 text-sm",
  lg: "py-3 px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full justify-center",
        className,
      )}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
