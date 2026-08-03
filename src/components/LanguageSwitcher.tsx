import { useRouterState } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { localeFromPath, localizedPath, LOCALE_LABEL } from "@/lib/i18n";

// 语言切换器:必须是真实的 <a href>(爬虫要能顺着它发现另一语言版本;
// 纯 JS 切换的切换器对 SEO 无效)。切换时停留在当前页面的对应语言路径。
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = localeFromPath(pathname);
  const target = current === "zh" ? "en" : "zh";
  const href = localizedPath(pathname, target);

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
