import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { backfillMissingWheelchairSlugs } from "@/lib/slug";

async function main() {
  const before = await prisma.wheelchair.count({ where: { slug: null } });

  await backfillMissingWheelchairSlugs();

  const after = await prisma.wheelchair.count({ where: { slug: null } });

  console.log("[SLUG] Wheelchair slug backfill complete", {
    before,
    updated: before - after,
    remaining: after,
  });
}

main()
  .catch((error) => {
    console.error("[SLUG] Wheelchair slug backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
