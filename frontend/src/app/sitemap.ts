import type { MetadataRoute } from "next";

const MARKETS = [
  { host: "https://employed.xibodev.com", country: "mz" },
  { host: "https://mx.employed.xibodev.com", country: "mx" },
];

const STATIC_PATHS = ["/", "/jobs", "/sign-in", "/sign-up"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const market of MARKETS) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${market.host}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.8,
      });
    }
  }

  return entries;
}