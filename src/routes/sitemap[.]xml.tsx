import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

// 规则:
// 1) 每条内容只列它的【规范地址】(canonical),避免同一内容多个 URL 互相稀释权重:
//    站内静态 HTML 文档 → .html 直链;数据库文章 → /articles/<slug>;英文内容 → /en/...
// 2) 中文文章的 /en/ 版本【不进 sitemap】——它 canonical 指回中文版(英文外壳+中文正文,
//    对搜索引擎是重复内容),只是给英文界面用户的浏览入口。
// 3) 不在 sitemap 里放 xhtml:link —— hreflang 已经在每页 <head> 输出,
//    Google 视两种方式等价,同时用两套只会制造冲突信号。
async function buildSitemap(): Promise<string> {
  const { data } = await supabase
    .from("resources")
    .select("slug, url, updated_at, lang")
    .eq("type", "article")
    .not("slug", "is", null);

  const staticPaths = [
    "/",
    "/resources",
    "/notes",
    "/about",
    "/ai-daily/",
    "/ai-briefing/",
    // 英文界面页(内容是原生英文的界面文案,不是中文页的翻版)
    "/en",
    "/en/resources",
    "/en/notes",
    "/en/about",
  ];
  const urls: string[] = staticPaths.map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`);

  const seen = new Set<string>();
  for (const r of data ?? []) {
    const isInternalDoc = r.url && r.url.startsWith("/") && r.url.endsWith(".html");
    const isEn = (r.lang as string) === "en";
    const loc = isInternalDoc
      ? `${SITE_URL}${r.url}`
      : `${SITE_URL}${isEn ? "/en" : ""}/articles/${r.slug}`;
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
