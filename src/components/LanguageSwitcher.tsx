import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { Languages } from "lucide-react";
import { localeFromPath, localizedPath, stripLocale, LOCALE_LABEL, type Locale } from "@/lib/i18n";

/** src/routes/en/ 下真实存在的页面。不在这个表里的路径没有英文版,
 *  切过去会 404(登录/账户/后台/个人主页等本就只做中文)。 */
const EN_PAGES = new Set(["/", "/about", "/resources", "/notes", "/search"]);
const EN_PREFIXES = ["/articles/"];

function hasEnglishVersion(path: string): boolean {
  return EN_PAGES.has(path) || EN_PREFIXES.some((p) => path.startsWith(p));
}

/** 文章页 loader 里查出的多语言版本(同 i18n_key 的各语言行) */
type Alt = { lang: string; slug: string };

// 语言切换器:必须是真实的 <a href>(爬虫要能顺着它发现另一语言版本;
// 纯 JS 切换的切换器对 SEO 无效)。切换时停留在当前页面的对应语言路径。
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // 文章页的译本可能是另一个 slug(中文版 foo / 英文版 foo-en),
  // 光换 /en 前缀会切到「英文外壳 + 中文正文」那种半成品页面,
  // 所以优先用 loader 查到的 alts 做映射(与 head 里的 hreflang 同一份数据)。
  // select 只取 matches(引用稳定),映射放到 useMemo 里做——
  // 在 select 里 flatMap 每次都产生新数组,会把组件推进无谓的重渲染。
  const matches = useRouterState({ select: (s) => s.matches });
  const alts = useMemo(
    () => matches.flatMap((m) => ((m.loaderData as { alts?: Alt[] } | undefined)?.alts ?? [])),
    [matches],
  );
  const current = localeFromPath(pathname);
  const target: Locale = current === "zh" ? "en" : "zh";

  const bare = stripLocale(pathname);
  const translated = alts.find((a) => a.lang === target)?.slug;
  const href = translated
    ? localizedPath(`/articles/${translated}`, target)
    : target === "en" && !hasEnglishVersion(bare)
      ? "/en" // 该页没有英文版,退到英文首页,别把人送进 404
      : localizedPath(pathname, target);

  return (
    <a
      href={href}
      // 这里就该写 React 的 hrefLang:渲染出的属性名虽是驼峰,但 HTML 属性名大小写不敏感,
      // 解析与 SEO 都不受影响(Google 只读 <head> 里的 link rel=alternate hreflang)。
      // 改成小写 hreflang 反而会让 React 报 "Invalid DOM property" 警告刷满开发台。
      hrefLang={target === "en" ? "en" : "zh-Hans"}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
      title={target === "en" ? "Switch to English" : "切换到中文"}
    >
      <Languages className="h-4 w-4" />
      {LOCALE_LABEL[target]}
    </a>
  );
}
