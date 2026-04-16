// src/components/dashboard/StatsCard.tsx
import { clsx } from "clsx";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: { value: number; label: string };
  color?: "primary" | "green" | "amber" | "red" | "slate";
  className?: string;
}

const COLOR_MAP = {
  primary: "text-primary-700 bg-primary-50",
  green: "text-emerald-700 bg-emerald-50",
  amber: "text-amber-700 bg-amber-50",
  red: "text-red-700 bg-red-50",
  slate: "text-slate-700 bg-slate-100",
};

const VALUE_COLOR = {
  primary: "text-primary-700",
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
  slate: "text-slate-900",
};

export function StatsCard({
  label,
  value,
  icon,
  trend,
  color = "slate",
  className,
}: StatsCardProps) {
  return (
    <div className={clsx("card p-5", className)}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xl",
            COLOR_MAP[color],
          )}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={clsx(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.value >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            )}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className={clsx("text-2xl font-bold mb-0.5", VALUE_COLOR[color])}>
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
      {trend && <p className="text-xs text-slate-400 mt-1">{trend.label}</p>}
    </div>
  );
}
