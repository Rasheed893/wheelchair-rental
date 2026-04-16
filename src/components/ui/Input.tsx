// src/components/ui/Input.tsx
import { clsx } from "clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        className={clsx(
          "input-field",
          error && "border-red-400 focus:ring-red-400 focus:border-red-400",
          className,
        )}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-slate-400 text-xs mt-1">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";
