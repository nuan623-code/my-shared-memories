import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

// 站内静态 HTML 文档以直链为规范地址(与文章页 canonical 规则一致),
// sitemap 对每条资源输出其规范地址:内部静态文档 → 直链;其余 → /articles/<slug>。
async function buildSitemap(): Promise<string> {
  const { data } = await supabase
    .from("resources")
    .select("slug, url, updated_at")
    .eq("type", "article")
    .not("slug", "is", null);

  const staticPaths = [
    "/",
    "/resources",
    "/notes",
    "/about",
    "/search",
    "/ai-daily/",
    "/ai-briefing/",
  ];
  const urls: string[] = staticPaths.map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`);
  const seen = new Set<string>();
  for (const r of data ?? []) {
    const isInternalDoc = r.url && r.url.startsWith("/") && r.url.endsWith(".html");
    const loc = isInternalDoc ? `${SITE_URL}${r.url}` : `${SITE_URL}/articles/${r.slug}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push(
      `<url><loc>${loc}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod></url>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = await buildSitemap();
        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=600",
          },
        });
      },
    },
  },
});
