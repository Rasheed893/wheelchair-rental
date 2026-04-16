// src/app/[locale]/loading.tsx
export default function Loading() {
  return (
    <div className="page-container py-10 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-64 bg-slate-100 rounded-2xl mb-10" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-10 bg-slate-100 rounded-xl mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
