import { createFileRoute } from "@tanstack/react-router";
import { SHARE_IMAGE } from "@/lib/site";

// 分享图的兜底。
//
// 正常情况下 /og/<slug>.jpg 是 public/og/ 下的静态文件,由 Cloudflare 的静态资源层
// 直接吐出来,根本到不了这个 Worker 路由。只有那篇还没生成分享图时请求才会落到这里 ——
// 这时候给通用分享图,而不是让爬虫吃一个 404(抓到 404 的 og:image,
// 有些平台会退化成完全不显示缩略图)。
export const Route = createFileRoute("/og/$slug")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 302,
          headers: {
            location: SHARE_IMAGE,
            // 缓存短一点:下一次发布就会把真图补上,别让 CDN 把兜底存太久
            "cache-control": "public, max-age=300",
          },
        }),
    },
  },
});
