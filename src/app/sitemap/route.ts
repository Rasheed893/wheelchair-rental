import { getSitemapIndexEntries, renderSitemapIndex, xmlResponse } from "@/lib/sitemap";

export async function GET() {
  const entries = await getSitemapIndexEntries();
  return xmlResponse(renderSitemapIndex(entries));
}
