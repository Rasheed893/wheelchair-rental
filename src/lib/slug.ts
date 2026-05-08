import { prisma } from "@/lib/prisma";

function asciiSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createWheelchairSlugCandidate(name: string, category?: string): string {
  const base = asciiSlug(name);
  if (base) {
    return base;
  }

  const fallback = asciiSlug(category ?? "wheelchair");
  return fallback || "wheelchair";
}

export async function generateUniqueWheelchairSlug(
  name: string,
  options?: { category?: string; excludeId?: string },
): Promise<string> {
  const base = createWheelchairSlugCandidate(name, options?.category);
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.wheelchair.findFirst({
      where: {
        slug,
        ...(options?.excludeId ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function backfillMissingWheelchairSlugs(): Promise<void> {
  const missing = await prisma.wheelchair.findMany({
    where: { slug: null },
    select: { id: true, name: true, category: true },
    orderBy: { createdAt: "asc" },
  });

  for (const wheelchair of missing) {
    const slug = await generateUniqueWheelchairSlug(wheelchair.name, {
      category: wheelchair.category,
      excludeId: wheelchair.id,
    });

    await prisma.wheelchair.update({
      where: { id: wheelchair.id },
      data: { slug },
    });
  }
}
