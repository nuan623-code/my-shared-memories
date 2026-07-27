import { useRouterState } from "@tanstack/react-router";
import { localeFromPath, localizedPath, type Locale } from "./index";
import { dict, type TKey } from "./dict";

/** 当前语言。取自 URL,SSR 与客户端一致(不会 hydration mismatch) */
export function useLocale(): Locale {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return localeFromPath(pathname);
}

/** 翻译函数;缺英文译文时回落中文,避免漏译变成空白 */
export function useT() {
  const locale = useLocale();
  return (key: TKey, vars?: Record<string, string | number>) => {
    const table = dict[locale] as Record<string, string>;
    let s = table[key] ?? (dict.zh as Record<string, string>)[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

/** 给站内路径加上当前语言前缀(中文无前缀) */
export function useLocalizedPath() {
  const locale = useLocale();
  return (path: string) => localizedPath(path, locale);
}
