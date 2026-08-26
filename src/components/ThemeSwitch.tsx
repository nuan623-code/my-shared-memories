import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";

// 主题三档开关(2026-08-26 重构阶段 3)。
// 与学习站 public/claude-code/assets/site.js 共用同一套约定:
//   localStorage 键 cc-theme ∈ system|light|dark;html[data-theme] 只在手动档时存在。
// 两边一致,主站与学习站之间跳转不会掉主题 —— 这是「四类页面一套视觉」的一部分。
export const THEME_KEY = "cc-theme";
export type ThemeMode = "system" | "light" | "dark";

const MODES: ThemeMode[] = ["system", "light", "dark"];
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** 只认识三个合法值,别的一律当 system —— localStorage 是用户可改的 */
export function normalizeTheme(v: string | null): ThemeMode {
  return v === "light" || v === "dark" ? v : "system";
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const t = useT();
  // SSR 读不到 localStorage,先按 system 渲染;挂载后再对齐真实值。
  // 首屏不闪是靠 __root 里那段 pre-hydration 脚本,不是靠这里。
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    try {
      setMode(normalizeTheme(localStorage.getItem(THEME_KEY)));
    } catch {
      /* 隐私模式下读不到,保持 system */
    }
  }, []);

  const pick = (next: ThemeMode) => {
    setMode(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 隐私模式下写不进,当次会话仍然生效 */
    }
  };

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className={`inline-flex items-center rounded-md border border-border bg-card/60 p-0.5 ${className}`}
    >
      {MODES.map((m) => {
        const Icon = ICONS[m];
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            aria-pressed={active}
            title={t(`theme.${m}` as "theme.system")}
            aria-label={t(`theme.${m}` as "theme.system")}
            className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
