import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ImportedArticle = {
  title: string;
  summary: string;
  coverUrl: string | null;
  html: string;
  publishedAt: string;
  sourceUrl: string;
};

function pickPublishedAt(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return new Date().toISOString();
  const candidates = [
    "publishedTime",
    "publishedAt",
    "datePublished",
    "article:published_time",
    "ogPublishedTime",
    "og:published_time",
  ];
  for (const k of candidates) {
    const v = metadata[k];
    if (typeof v === "string" && v.length > 0) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function addNoReferrer(html: string): string {
  // 让微信图片在跨站环境下能加载（绕过 referer 防盗链失败时的 403 提示）
  return html.replace(/<img\b([^>]*)>/gi, (m, attrs: string) => {
    if (/referrerpolicy=/i.test(attrs)) return m;
    return `<img${attrs} referrerpolicy="no-referrer">`;
  });
}

function wrapHtml(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${title.replace(/</g, "&lt;")}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif;max-width:760px;margin:0 auto;padding:32px 20px;color:#1a1a1a;line-height:1.8;font-size:16px}
img,video{max-width:100%;height:auto;border-radius:6px}
h1,h2,h3{line-height:1.4;margin-top:1.6em}
p{margin:1em 0}
blockquote{border-left:3px solid #e5e7eb;padding-left:1em;color:#6b7280;margin:1em 0}
pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto}
code{background:#f5f5f5;padding:2px 4px;border-radius:3px;font-size:0.9em}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
</style></head><body>${body}</body></html>`;
}

export const importWechatArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { url: string }) => {
    if (!data || typeof data.url !== "string") throw new Error("缺少 URL");
    const u = data.url.trim();
    if (!/^https?:\/\//i.test(u)) throw new Error("URL 必须以 http(s):// 开头");
    return { url: u };
  })
  .handler(async ({ data }): Promise<ImportedArticle> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY 未配置");

    const { default: Firecrawl } = await import("@mendable/firecrawl-js");
    const fc = new Firecrawl({ apiKey });

    const result = await fc.scrape(data.url, {
      formats: ["html", "markdown", "summary"],
      onlyMainContent: true,
    });

    type ScrapeShape = {
      html?: string;
      markdown?: string;
      summary?: string;
      metadata?: Record<string, unknown>;
      data?: {
        html?: string;
        markdown?: string;
        summary?: string;
        metadata?: Record<string, unknown>;
      };
    };
    const r = result as ScrapeShape;
    const inner = r.data ?? r;
    const html = inner.html ?? "";
    const metadata = inner.metadata ?? {};
    const summary = inner.summary ?? "";

    if (!html) throw new Error("未抓到正文内容");

    const title =
      (metadata.title as string | undefined) ||
      (metadata.ogTitle as string | undefined) ||
      "未命名文章";
    const coverUrl =
      (metadata.ogImage as string | undefined) ||
      (metadata.image as string | undefined) ||
      null;

    const processedHtml = wrapHtml(title, addNoReferrer(html));

    return {
      title,
      summary: summary || ((metadata.description as string | undefined) ?? ""),
      coverUrl,
      html: processedHtml,
      publishedAt: pickPublishedAt(metadata),
      sourceUrl: data.url,
    };
  });
