// 双语核心:URL 决定语言,SSR 阶段即可确定(爬虫不执行 JS,不能靠客户端切换)。
//   /            → 中文(默认语言,保持现有 URL 不变,不损失已有 SEO 权重)
//   /en/...      → English
export type Locale = "zh" | "en";

export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALES: Locale[] = ["zh", "en"];

/** hreflang 用的语言标记(比裸 zh/en 更精确,Google 推荐带地区或书写系统) */
export const HREFLANG: Record<Locale, string> = { zh: "zh-Hans", en: "en" };
/** <html lang> 用 */
export const HTML_LANG: Record<Locale, string> = { zh: "zh-CN", en: "en" };
export const LOCALE_LABEL: Record<Locale, string> = { zh: "中文", en: "English" };

/** 从 pathname 解析语言 */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh";
}

/** 去掉语言前缀,得到「语言无关」的路径(总是以 / 开头) */
export function stripLocale(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname;
}

/** 给语言无关路径加上目标语言前缀 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = stripLocale(path.startsWith("/") ? path : `/${path}`);
  if (locale === "zh") return clean;
  return clean === "/" ? "/en" : `/en${clean}`;
}
