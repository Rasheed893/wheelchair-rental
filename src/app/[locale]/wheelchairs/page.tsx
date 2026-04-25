// src/app/[locale]/wheelchairs/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import WheelchairCard from "@/components/wheelchair/WheelchairCard";
import type { WheelchairCategory } from "@prisma/client";
import { buildListingMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ category?: string; search?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildListingMetadata(locale as Locale);
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: {
  value: WheelchairCategory | "ALL";
  en: string;
  ar: string;
}[] = [
  { value: "ALL", en: "All", ar: "الكل" },
  { value: "STANDARD", en: "Standard", ar: "عادي" },
  { value: "ELECTRIC", en: "Electric", ar: "كهربائي" },
  { value: "PEDIATRIC", en: "Pediatric", ar: "أطفال" },
  { value: "BARIATRIC", en: "Bariatric", ar: "ثقيل الوزن" },
  { value: "TRANSPORT", en: "Transport", ar: "نقل" },
];

async function getWheelchairs(category?: string, search?: string, page = 1) {
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const where = {
    status: "AVAILABLE" as const,
    ...(category &&
      category !== "ALL" && { category: category as WheelchairCategory }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { nameAr: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [wheelchairs, total] = await Promise.all([
    prisma.wheelchair.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.wheelchair.count({ where }),
  ]);

  return { wheelchairs, total, totalPages: Math.ceil(total / pageSize) };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WheelchairsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const isAr = locale === "ar";
  const page = Number(resolvedSearchParams?.page ?? 1);
  const { wheelchairs, total, totalPages } = await getWheelchairs(
    resolvedSearchParams?.category,
    resolvedSearchParams?.search,
    page,
  );

  return (
    <div className="page-container py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-heading mb-2">
          {isAr ? "تصفح الكراسي المتحركة" : "Browse Wheelchairs"}
        </h1>
        <p className="text-slate-500 text-sm">
          {total} {isAr ? "كرسي متاح" : "wheelchairs available"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <a
            key={cat.value}
            href={`/${locale}/wheelchairs${cat.value !== "ALL" ? `?category=${cat.value}` : ""}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              resolvedSearchParams?.category === cat.value ||
              (!resolvedSearchParams?.category && cat.value === "ALL")
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
            }`}
          >
            {isAr ? cat.ar : cat.en}
          </a>
        ))}

        {/* Search */}
        <form method="get" className="ms-auto flex gap-2">
          {resolvedSearchParams?.category && (
            <input
              type="hidden"
              name="category"
              value={resolvedSearchParams.category}
            />
          )}
          <input
            type="search"
            name="search"
            defaultValue={resolvedSearchParams?.search}
            placeholder={isAr ? "ابحث..." : "Search..."}
            className="input-field w-48 py-2"
          />
          <button type="submit" className="btn-primary py-2 px-4">
            {isAr ? "بحث" : "Search"}
          </button>
        </form>
      </div>

      {/* Grid */}
      {wheelchairs.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <span className="text-6xl block mb-4">🔍</span>
          <p className="text-lg">
            {isAr ? "لا توجد نتائج" : "No wheelchairs found"}
          </p>
          <a
            href={`/${locale}/wheelchairs`}
            className="text-primary-600 text-sm mt-2 inline-block hover:underline"
          >
            {isAr ? "عرض الكل" : "Clear filters"}
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wheelchairs.map((w, i) => (
            <WheelchairCard
              key={w.id}
              wheelchair={w as any}
              locale={locale}
              // Task 8: preload first 4 cards on listing page (above fold)
              priority={i < 4}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/${locale}/wheelchairs?${new URLSearchParams({ ...(resolvedSearchParams || {}), page: String(p) })}`}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium border transition-colors ${
                p === page
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// // src/app/[locale]/wheelchairs/page.tsx
// import { prisma } from "@/lib/prisma";
// import WheelchairCard from "@/components/wheelchair/WheelchairCard";
// import type { WheelchairCategory } from "@prisma/client";

// interface Props {
//   params: Promise<{ locale: string }>;
//   searchParams?: Promise<{ category?: string; search?: string; page?: string }>;
// }

// const CATEGORIES: {
//   value: WheelchairCategory | "ALL";
//   en: string;
//   ar: string;
// }[] = [
//   { value: "ALL", en: "All", ar: "الكل" },
//   { value: "STANDARD", en: "Standard", ar: "عادي" },
//   { value: "ELECTRIC", en: "Electric", ar: "كهربائي" },
//   { value: "PEDIATRIC", en: "Pediatric", ar: "أطفال" },
//   { value: "BARIATRIC", en: "Bariatric", ar: "ثقيل الوزن" },
//   { value: "TRANSPORT", en: "Transport", ar: "نقل" },
// ];

// async function getWheelchairs(category?: string, search?: string, page = 1) {
//   const pageSize = 12;
//   const skip = (page - 1) * pageSize;

//   const where = {
//     status: "AVAILABLE" as const,
//     ...(category &&
//       category !== "ALL" && { category: category as WheelchairCategory }),
//     ...(search && {
//       OR: [
//         { name: { contains: search, mode: "insensitive" as const } },
//         { nameAr: { contains: search, mode: "insensitive" as const } },
//       ],
//     }),
//   };

//   const [wheelchairs, total] = await Promise.all([
//     prisma.wheelchair.findMany({
//       where,
//       skip,
//       take: pageSize,
//       orderBy: { createdAt: "desc" },
//     }),
//     prisma.wheelchair.count({ where }),
//   ]);

//   return { wheelchairs, total, totalPages: Math.ceil(total / pageSize) };
// }

// export default async function WheelchairsPage({ params, searchParams }: Props) {
//   const { locale } = await params;
//   const resolvedSearchParams = await searchParams;
//   const isAr = locale === "ar";
//   const page = Number(resolvedSearchParams?.page ?? 1);
//   const { wheelchairs, total, totalPages } = await getWheelchairs(
//     resolvedSearchParams?.category,
//     resolvedSearchParams?.search,
//     page,
//   );

//   return (
//     <div className="page-container py-10">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="section-heading mb-2">
//           {isAr ? "تصفح الكراسي المتحركة" : "Browse Wheelchairs"}
//         </h1>
//         <p className="text-slate-500 text-sm">
//           {total} {isAr ? "كرسي متاح" : "wheelchairs available"}
//         </p>
//       </div>

//       {/* Filters */}
//       <div className="flex flex-wrap gap-2 mb-8">
//         {CATEGORIES.map((cat) => (
//           <a
//             key={cat.value}
//             href={`/${locale}/wheelchairs${cat.value !== "ALL" ? `?category=${cat.value}` : ""}`}
//             className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
//               resolvedSearchParams?.category === cat.value ||
//               (!resolvedSearchParams?.category && cat.value === "ALL")
//                 ? "bg-primary-600 text-white border-primary-600"
//                 : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
//             }`}
//           >
//             {isAr ? cat.ar : cat.en}
//           </a>
//         ))}

//         {/* Search */}
//         <form method="get" className="ms-auto flex gap-2">
//           {resolvedSearchParams?.category && (
//             <input
//               type="hidden"
//               name="category"
//               value={resolvedSearchParams.category}
//             />
//           )}
//           <input
//             type="search"
//             name="search"
//             defaultValue={resolvedSearchParams?.search}
//             placeholder={isAr ? "ابحث..." : "Search..."}
//             className="input-field w-48 py-2"
//           />
//           <button type="submit" className="btn-primary py-2 px-4">
//             {isAr ? "بحث" : "Search"}
//           </button>
//         </form>
//       </div>

//       {/* Grid */}
//       {wheelchairs.length === 0 ? (
//         <div className="text-center py-24 text-slate-400">
//           <span className="text-6xl block mb-4">🔍</span>
//           <p className="text-lg">
//             {isAr ? "لا توجد نتائج" : "No wheelchairs found"}
//           </p>
//           <a
//             href={`/${locale}/wheelchairs`}
//             className="text-primary-600 text-sm mt-2 inline-block hover:underline"
//           >
//             {isAr ? "عرض الكل" : "Clear filters"}
//           </a>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           {wheelchairs.map((w) => (
//             <WheelchairCard key={w.id} wheelchair={w as any} locale={locale} />
//           ))}
//         </div>
//       )}

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className="flex justify-center gap-2 mt-12">
//           {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
//             <a
//               key={p}
//               href={`/${locale}/wheelchairs?${new URLSearchParams({ ...(resolvedSearchParams || {}), page: String(p) })}`}
//               className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium border transition-colors ${
//                 p === page
//                   ? "bg-primary-600 text-white border-primary-600"
//                   : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
//               }`}
//             >
//               {p}
//             </a>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
