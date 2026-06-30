import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function buildSitemap(origin: string): Promise<string> {
  const sb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.from("resources").select("slug, type, updated_at").eq("type", "article").not("slug", "is", null);

  const staticPaths = ["/", "/resources", "/notes", "/about", "/search"];
  const urls: string[] = [];
  for (const p of staticPaths) urls.push(`<url><loc>${origin}${p}</loc></url>`);
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
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
      },
    },
  },
});
