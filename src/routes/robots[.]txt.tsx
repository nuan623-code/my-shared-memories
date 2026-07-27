import { createFileRoute } from "@tanstack/react-router";

// 目标:被 AI 搜索引用(而不是被屏蔽)。要点:
// 1) 引用走的是「检索类」爬虫(OAI-SearchBot / Claude-SearchBot / PerplexityBot),必须放行;
//    屏蔽训练类爬虫并不会增加引用,只会减少曝光,个人博客没有理由拦。
// 2) 爬虫只遵守【最具体】的那一组 UA 规则,不与 `*` 组叠加 —— 所以私有路径的保护
//    不能指望 robots.txt(/account /admin 本来就有服务端鉴权,这里只是给通用爬虫一个提示)。
// 3) Google-Extended 只影响 Gemini 的训练与 grounding,不影响搜索排名;放行才可能进 Gemini 引用。
// 4) Bytespider 抓取量大、无检索回流,且多方实测无视 Disallow —— 这里只是表态,
//    真要拦需在 Cloudflare WAF 层做。
const body = `# === AI 搜索检索类:想被引用必须放行 ===
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

# === 用户主动触发的抓取 ===
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Perplexity-User
Allow: /

# === Google:AI Overviews / AI Mode 由 Googlebot 控制 ===
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

# === 训练类:以扩大技术影响力为目标,放行 ===
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

# === 无检索回流且实测无视 robots(需 WAF 层同步拦截) ===
User-agent: Bytespider
Disallow: /

# === 兜底 ===
User-agent: *
Allow: /
Disallow: /auth
Disallow: /account
Disallow: /admin
Disallow: /search
Disallow: /en/search

Sitemap: https://mingyuyang.com/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } }),
    },
  },
});
