import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { contentDate } from "@/lib/resources";

// 站点 RSS(2026-08-26 新增)。日更站没有 feed = 放弃回访读者。
// 规则,与 sitemap.xml 保持同一套 canonical 口径:
// 1) 只出【中文主站】内容;英文版本 canonical 指回中文,进 feed 会变重复条目。
// 2) 链接取内容的规范地址:静态 HTML 文档(简报/深度/Claude Code/长文)→ .html 直链,
//    其余数据库文章 → /articles/<slug>。
// 3) pubDate 用 contentDate() 而不是 published_at —— 后者是入库时间,
//    每日栏目常晚一天,直接进 feed 会让阅读器把日期显示错。
const FEED_SIZE = 50;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function buildFeed(): Promise<string> {
  const { data } = await supabase
    .from("resources")
    .select("slug, title, summary, url, published_at, lang, subcategory")
    .eq("type", "article")
    .not("slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(FEED_SIZE * 2);

  const rows = (data ?? [])
    .filter((r) => (r.lang ?? "zh") !== "en")
    .map((r) => ({ ...r, date: contentDate(r as never) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, FEED_SIZE);

  const items = rows.map((r) => {
    const isDoc = r.url && r.url.startsWith("/") && r.url.endsWith(".html");
    const link = isDoc ? `${SITE_URL}${r.url}` : `${SITE_URL}/articles/${r.slug}`;
    const desc = r.summary?.trim() || r.title || "";
    return [
      "<item>",
      `<title>${esc(r.title ?? "未命名")}</title>`,
      `<link>${esc(link)}</link>`,
      `<guid isPermaLink="true">${esc(link)}</guid>`,
      `<pubDate>${new Date(r.date).toUTCString()}</pubDate>`,
      r.subcategory ? `<category>${esc(r.subcategory)}</category>` : "",
      `<description>${esc(desc)}</description>`,
      "</item>",
    ]
      .filter(Boolean)
      .join("");
  });

  const built = rows.length ? new Date(rows[0].date).toUTCString() : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE_NAME)}</title>
<link>${SITE_URL}</link>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
<description>每天讲透一个 AI 主题 —— AI 每日简报、AI 深度学习、Claude Code 实战,外加手写长文。</description>
<language>zh-CN</language>
<lastBuildDate>${built}</lastBuildDate>
${items.join("\n")}
</channel>
</rss>`;
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = await buildFeed();
        return new Response(xml, {
          headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control": "public, max-age=600",
          },
        });
      },
    },
  },
});
