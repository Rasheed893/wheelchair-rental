// src/components/ui/EmptyState.tsx
// ─────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = "📭",
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <span className="text-5xl block mb-4">{icon}</span>
      <h3 className="font-semibold text-slate-700 text-lg mb-1">{title}</h3>
      {subtitle && <p className="text-slate-400 text-sm mb-6">{subtitle}</p>}
      {action}
    </div>
  );
}
