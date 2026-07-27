// 多语言 head 元数据生成:每个语言版本 canonical 指向自己(不能都指向中文版,
// 否则 hreflang 失效),并输出 hreflang 自引用 + 双向互指 + x-default。
import { HREFLANG, LOCALES, localizedPath, type Locale } from "./index";
import { SITE_URL, SHARE_IMAGE } from "@/lib/site";

const OG_LOCALE: Record<Locale, string> = { zh: "zh_CN", en: "en_US" };

export function i18nHead(opts: {
  /** 语言无关路径,如 "/about";文章页传 "/articles/xxx" */
  path: string;
  locale: Locale;
  title: string;
  description: string;
  ogType?: "website" | "article";
  /** 该内容有哪些语言版本。默认两种都有(界面页);单语文章只传自身语言 */
  alternates?: Locale[];
  /** 语言版本落在不同路径时的映射(如中英文章 slug 不同) */
  pathFor?: Partial<Record<Locale, string>>;
}) {
  const { path, locale, title, description, ogType = "website" } = opts;
  const alternates = opts.alternates ?? LOCALES;
  const hrefOf = (l: Locale) => SITE_URL + localizedPath(opts.pathFor?.[l] ?? path, l);
  const url = hrefOf(locale);

  // 注意:key 用全小写 hreflang。TanStack 把 links 的键原样输出成属性,
  // 写成 React 风格的 hrefLang 会渲染出 hrefLang=""(HTML 大小写虽不敏感,
  // 但严格解析的爬虫有风险),这里直接输出规范形式。
  const links: Array<{ rel: string; href: string; hreflang?: string }> = [
    { rel: "canonical", href: url },
  ];
  // 只有真的存在多语言版本时才输出 hreflang;单语页输出会被判为错误配置
  if (alternates.length > 1) {
    for (const l of alternates) {
      links.push({ rel: "alternate", hreflang: HREFLANG[l], href: hrefOf(l) });
    }
    // x-default 指向默认语言版本,给语言不匹配的用户兜底
    links.push({ rel: "alternate", hreflang: "x-default", href: hrefOf("zh") });
  }

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: url },
      { property: "og:locale", content: OG_LOCALE[locale] },
      { property: "og:site_name", content: "Mingyu's Library" },
      { property: "og:image", content: SHARE_IMAGE },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links,
  };
}
