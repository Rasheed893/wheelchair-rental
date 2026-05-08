import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { backfillMissingWheelchairSlugs } from "@/lib/slug";

export const publicWheelchairSelect = {
  id: true,
  slug: true,
  name: true,
  nameAr: true,
  description: true,
  descriptionAr: true,
  category: true,
  status: true,
  pricePerDay: true,
  stockQuantity: true,
  images: true,
  features: true,
  featuresAr: true,
  weight: true,
  maxLoad: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getPublicWheelchairByIdentifier = unstable_cache(
  async (identifier: string) => {
    await backfillMissingWheelchairSlugs();

    return prisma.wheelchair.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: publicWheelchairSelect,
    });
  },
  ["public-wheelchair-by-identifier"],
  { revalidate: 3600, tags: ["wheelchairs", "seo"] },
);
