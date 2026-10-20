import type { MetadataRoute } from "next";

const PAGES = ["", "/use-cases", "/fit-demo", "/methodology", "/pricing", "/request-demo"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `https://sizememo.site${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
