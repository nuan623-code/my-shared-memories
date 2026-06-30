import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

async function buildSitemap(origin: string): Promise<string> {
  const { data } = await supabase
    .from("resources")
    .select("slug, updated_at")
    .eq("type", "article")
    .not("slug", "is", null);

  const staticPaths = ["/", "/resources", "/notes", "/about", "/search"];
  const urls: string[] = staticPaths.map((p) => `<url><loc>${origin}${p}</loc></url>`);
  for (const r of data ?? []) {
    urls.push(`<url><loc>${origin}/articles/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const xml = await buildSitemap(origin);
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
