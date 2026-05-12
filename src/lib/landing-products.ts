import { unstable_cache } from "next/cache";
import type { WheelchairCategory, WheelchairStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backfillMissingWheelchairSlugs } from "@/lib/slug";
import type { LandingPageKey } from "@/lib/landing-pages";

export interface LandingProduct {
  id: string;
  slug: string | null;
  name: string;
  nameAr: string;
  category: WheelchairCategory;
  pricePerDay: number;
  images: string[];
  status: WheelchairStatus;
}

const CATEGORY_PRIORITY: Record<LandingPageKey, WheelchairCategory[]> = {
  dubai: ["STANDARD", "TRANSPORT", "ELECTRIC", "BARIATRIC", "PEDIATRIC"],
  airport: ["TRANSPORT", "STANDARD", "ELECTRIC", "PEDIATRIC", "BARIATRIC"],
  surgery: ["STANDARD", "BARIATRIC", "ELECTRIC", "TRANSPORT", "PEDIATRIC"],
  arabic: ["STANDARD", "TRANSPORT", "ELECTRIC", "BARIATRIC", "PEDIATRIC"],
};

const FEATURE_PRIORITY: Record<LandingPageKey, string[]> = {
  dubai: [],
  airport: ["transport", "manual", "fold", "light", "travel", "compact"],
  surgery: ["standard", "reclin", "bariatric", "electric", "comfort"],
  arabic: [],
};

function scoreProduct(product: LandingProduct, key: LandingPageKey) {
  const categories = CATEGORY_PRIORITY[key];
  const features = FEATURE_PRIORITY[key];
  const categoryScore = categories.includes(product.category)
    ? (categories.length - categories.indexOf(product.category)) * 20
    : 0;
  const statusScore = product.status === "AVAILABLE" ? 1000 : 0;
  const nameText = `${product.name} ${product.nameAr}`.toLowerCase();
  const featureScore = features.reduce(
    (score, feature) => score + (nameText.includes(feature) ? 8 : 0),
    0,
  );

  return statusScore + categoryScore + featureScore;
}

function selectLandingProducts(
  products: LandingProduct[],
  key: LandingPageKey,
  limit: number,
) {
  const sorted = [...products].sort((a, b) => {
    const scoreDifference = scoreProduct(b, key) - scoreProduct(a, key);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return a.name.localeCompare(b.name);
  });

  const selected: LandingProduct[] = [];

  for (const category of CATEGORY_PRIORITY[key]) {
    const match = sorted.find(
      (product) =>
        product.category === category &&
        !selected.some((selectedProduct) => selectedProduct.id === product.id),
    );

    if (match) {
      selected.push(match);
    }

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const product of sorted) {
    if (selected.some((selectedProduct) => selectedProduct.id === product.id)) {
      continue;
    }

    selected.push(product);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

const getCachedLandingProducts = unstable_cache(
  async (key: LandingPageKey, limit = 6): Promise<LandingProduct[]> => {
    await backfillMissingWheelchairSlugs();

    const products = await prisma.wheelchair.findMany({
      where: {
        status: { not: "RETIRED" },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        nameAr: true,
        category: true,
        pricePerDay: true,
        images: true,
        status: true,
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 30,
    });

    const normalizedProducts = products.map((product) => ({
      ...product,
      pricePerDay: Number(product.pricePerDay),
    }));

    return selectLandingProducts(normalizedProducts, key, limit);
  },
  ["landing-products"],
  { revalidate: 3600, tags: ["wheelchairs", "seo", "landing-products"] },
);

export function getLandingProducts(key: LandingPageKey, limit = 6) {
  return getCachedLandingProducts(key, limit);
}
