import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

// llms.txt(llmstxt.org 提案格式)。现实评估:2026 年实测绝大多数站点的 llms.txt
// 无人抓取,Google 也公开表示不使用它。这里做成动态路由的原因只是「零维护成本」——
// 它永远跟着库里的内容走,不需要人工同步;真正影响 AI 引用的是
// robots.txt 放行检索类爬虫 + 正文服务端可见(见 robots[.]txt.tsx / 列表页 loader)。
const SECTIONS: Array<{ title: string; subcategory: string; note: string }> = [
  { title: "AI deep dives (daily)", subcategory: "daily", note: "每天一个 AI 主题的深度文档" },
  { title: "AI daily briefing", subcategory: "briefing", note: "每日 AI 技术情报速览" },
  { title: "Agents", subcategory: "agent", note: "智能体架构、MCP、工具调用" },
  { title: "AI engineering", subcategory: "engineering", note: "上下文工程、评测、工程实践" },
  { title: "LLMs", subcategory: "llm", note: "模型原理与提示工程" },
];

function line(r: { title: string | null; url: string | null; slug: string | null; summary: string | null }) {
  const href =
    r.url && r.url.startsWith("/") ? `${SITE_URL}${r.url}` : `${SITE_URL}/articles/${r.slug}`;
  const sum = (r.summary ?? "").replace(/\s+/g, " ").slice(0, 160);
  return `- [${r.title ?? r.slug}](${href})${sum ? `: ${sum}` : ""}`;
}

async function build(): Promise<string> {
  const { data } = await supabase
    .from("resources")
    .select("title, slug, url, summary, subcategory, published_at")
    .eq("type", "article")
    .not("slug", "is", null)
    .order("published_at", { ascending: false });
  const rows = data ?? [];

  const out: string[] = [
    "# Mingyu's Library",
    "",
    "> Personal library of Mingyu Yang: AI engineering deep dives, a daily AI briefing, mobile growth/attribution notes, and study notes. Most long-form content is in Chinese; the interface and some articles are available in English under /en/.",
    "",
    `Site: ${SITE_URL} · English: ${SITE_URL}/en · Author: Mingyu Yang`,
    "",
  ];

  for (const s of SECTIONS) {
    const items = rows.filter((r) => r.subcategory === s.subcategory).slice(0, 25);
    if (!items.length) continue;
    out.push(`## ${s.title}`, "", `${s.note}`, "");
    for (const r of items) out.push(line(r));
    out.push("");
  }

  const rest = rows.filter((r) => !SECTIONS.some((s) => s.subcategory === r.subcategory)).slice(0, 25);
  if (rest.length) {
    out.push("## Optional", "", "其他文章与出海/增长笔记", "");
    for (const r of rest) out.push(line(r));
    out.push("");
  }
  return out.join("\n");
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await build(), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
