import {
  getPageSitemapEntries,
  getWheelchairSitemapEntries,
  renderUrlSet,
  renderWheelchairUrlSet,
  xmlResponse,
} from "@/lib/sitemap";

type Context = {
  params: Promise<{ name: string }>;
};
export async function generateStaticParams() {
  return [{ name: "pages" }, { name: "wheelchairs" }];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: Context) {
  const { name: rawName } = await params;
  const name = rawName.replace(/\.xml$/, "");

  if (name === "pages") {
    return xmlResponse(renderUrlSet(getPageSitemapEntries()));
  }

  if (name === "wheelchairs") {
    const entries = await getWheelchairSitemapEntries();
    return xmlResponse(renderWheelchairUrlSet(entries));
  }

  return new Response("Not found", { status: 404 });
}
