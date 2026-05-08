ALTER TABLE "wheelchairs"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "wheelchairs_slug_key" ON "wheelchairs"("slug");
CREATE INDEX "wheelchairs_slug_idx" ON "wheelchairs"("slug");
