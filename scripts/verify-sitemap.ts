import {
  renderSitemapIndex,
  renderUrlSet,
  renderWheelchairUrlSet,
} from "../src/lib/sitemap";

const indexXml = renderSitemapIndex([
  { url: "https://example.com/sitemaps/pages.xml" },
]);
const pagesXml = renderUrlSet([
  { path: "/", priority: "1.0", changeFrequency: "weekly" },
]);
const wheelchairsXml = renderWheelchairUrlSet([
  {
    slug: "lightweight-electric-wheelchair",
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  },
]);

console.log(indexXml.includes("<sitemapindex"));
console.log(pagesXml.includes("xhtml:link"));
console.log(wheelchairsXml.includes("lightweight-electric-wheelchair"));
console.log(indexXml.includes("//sitemaps"));
