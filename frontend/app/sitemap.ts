import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://fernetloshorneros.com"

  return [
    {
      url: base,
      lastModified: new Date("2026-11-26T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/productos`,
      lastModified: new Date("2026-11-25T18:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/lista-espera`,
      lastModified: new Date("2026-11-15T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/contactanos`,
      lastModified: new Date("2026-10-01T00:00:00.000Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${base}/terminos`,
      lastModified: new Date("2026-06-27T00:00:00.000Z"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
