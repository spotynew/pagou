import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://pagou.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/eventos", changefreq: "daily", priority: "0.9" },
          { path: "/cursos", changefreq: "daily", priority: "0.9" },
          { path: "/vender", changefreq: "monthly", priority: "0.6" },
          { path: "/termos", changefreq: "yearly", priority: "0.3" },
          { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const [{ data: events }, { data: courses }] = await Promise.all([
            supabase.from("events").select("slug").eq("published", true),
            supabase.from("courses").select("slug").eq("published", true),
          ]);
          for (const e of events ?? []) entries.push({ path: `/eventos/${e.slug}`, changefreq: "weekly", priority: "0.7" });
          for (const c of courses ?? []) entries.push({ path: `/cursos/${c.slug}`, changefreq: "weekly", priority: "0.7" });
        } catch {
          // fall back to static routes only
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});