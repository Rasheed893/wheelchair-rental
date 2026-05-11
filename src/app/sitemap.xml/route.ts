import {
  getSitemapIndexEntries,
  renderSitemapIndex,
  xmlResponse,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const entries = await getSitemapIndexEntries();
  return xmlResponse(renderSitemapIndex(entries));
}
