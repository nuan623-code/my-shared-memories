// 结构化数据(JSON-LD)。
//
// 输出方式:TanStack 原生支持在 head 的 meta 数组里放 { "script:ld+json": {...} },
// 它会渲染成 <script type="application/ld+json">(见 headContentUtils.js),
// 不用自己拼 script 标签,也不会有转义问题。
//
// 口径:
//   - 只描述页面上真实存在的东西,不为了凑富结果编造字段(评分、价格、组织身份都没有)。
//   - sameAs 只列确实属于本人的主页,查不到的不写。
//   - 不出 SearchAction:Google 已于 2024 年下线 Sitelinks searchbox,
//     而且 /search 在 robots.txt 里是 Disallow,指过去只会是个失效信号。
import type { DetailedHTMLProps, MetaHTMLAttributes } from "react";
import { SITE_URL, SITE_NAME, SHARE_IMAGE, absUrl } from "@/lib/site";
import type { Resource } from "@/lib/resources";
import type { Locale } from "@/lib/i18n";

const AUTHOR_URL = `${SITE_URL}/about`;

/** 作者本人。文章的 author 和站点的 publisher 都指向这一个节点,靠 @id 复用 */
function person() {
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: "Mingyu Yang",
    alternateName: "杨鸣宇",
    url: AUTHOR_URL,
    sameAs: [
      "https://github.com/nuan623-code",
      "https://www.linkedin.com/in/mingyu-yang-7048389b/",
    ],
  };
}

/** 站点本身。放在首页,给搜索引擎一个「这个域名是什么」的锚点 */
export function websiteJsonLd(locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description,
    inLanguage: locale === "en" ? "en" : "zh-Hans",
    publisher: person(),
  };
}

/** 关于页:主角就是人 */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    ...person(),
    mainEntityOfPage: AUTHOR_URL,
  };
}

/**
 * 文章页。用 BlogPosting 而不是 NewsArticle —— 这是个人博客内容,
 * NewsArticle 对新闻发布者有额外要求,套上去属于错配。
 */
export function articleJsonLd(opts: {
  article: Resource;
  /** 该文的规范地址(与 head 里的 canonical 同一个值) */
  canonical: string;
  /** og:image,目前是站点通用分享图 */
  image?: string;
}) {
  const { article: a, canonical } = opts;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonical}#article`,
    headline: (a.title ?? SITE_NAME).slice(0, 110),
    ...(a.summary?.trim() ? { description: a.summary.trim().slice(0, 300) } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
    datePublished: new Date(a.published_at).toISOString(),
    dateModified: new Date(a.updated_at || a.published_at).toISOString(),
    inLanguage: (a.lang ?? "zh") === "en" ? "en" : "zh-Hans",
    author: person(),
    publisher: person(),
    image: opts.image ?? SHARE_IMAGE,
    ...(a.tags?.length ? { keywords: a.tags.join(", ") } : {}),
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

/**
 * 面包屑。文章页的层级是 首页 › 资料库 › 这篇。
 * 只有两级以上才值得输出,单级面包屑在 Search Console 里会被判为无效。
 */
export function breadcrumbJsonLd(
  trail: Array<{ name: string; path: string }>,
): Record<string, unknown> | null {
  if (trail.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: absUrl(step.path),
    })),
  };
}

type MetaTag = DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>;

/**
 * 把一段结构化数据包成 head.meta 里的一项。
 *
 * TanStack 运行时认 "script:ld+json" 这个键(headContentUtils.js 里专门分支处理),
 * 但它导出的 meta 类型还是 <meta> 的 HTML 属性,没把这个键纳进去。所以这里集中做一次
 * 断言,别让每个路由各写各的 as any。传 null 则不输出 —— 配合 breadcrumbJsonLd 的
 * 「层级不够就返回 null」。
 */
export function ldMeta(obj: Record<string, unknown> | null | undefined): MetaTag[] {
  return obj ? ([{ "script:ld+json": obj }] as unknown as MetaTag[]) : [];
}
