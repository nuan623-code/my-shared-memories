// 站点级常量:分享/SEO 元数据必须用绝对 URL(OG 协议要求,爬虫不解析相对路径)。
export const SITE_URL = "https://mingyuyang.com";
export const SITE_NAME = "Mingyu's Library";
// 通用分享缩略图(1024×1024 PNG;社交平台不接受 SVG 作 og:image)
export const SHARE_IMAGE = `${SITE_URL}/share-card.png`;

/** 给 og:url / canonical 拼绝对地址 */
export function absUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

/**
 * 某篇文章的分享图地址。文件由 scripts/generate-og.mjs 在发布时生成到 public/og/,
 * 万一某篇还没生成,/og/$slug 这个兜底路由会把请求转到通用分享图上,不会 404。
 * slug 里可能有中文,必须编码 —— og:image 要求是合法 URL。
 */
export function ogImageFor(slug: string): string {
  return `${SITE_URL}/og/${encodeURIComponent(slug)}.jpg`;
}
