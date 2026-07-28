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
      // 用展开写小写 hreflang:React 的 hrefLang 在这里会被原样输出成驼峰属性,
      // 虽然 HTML 属性名大小写不敏感、不影响 SEO(Google 只读 head 里的 link),
      // 但源码里出现驼峰 hreflang 容易被后来的人当成错误,统一成规范写法。
      {...{ hreflang: target === "en" ? "en" : "zh-Hans" }}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
      title={target === "en" ? "Switch to English" : "切换到中文"}
    >
      <Languages className="h-4 w-4" />
      {LOCALE_LABEL[target]}
    </a>
  );
}
