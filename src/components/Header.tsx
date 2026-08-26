import { Link } from "@tanstack/react-router";
import { Library, Menu, X, Search, Plus, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdminStatus } from "@/hooks/use-is-admin";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useLocale, useT } from "@/lib/i18n/use-t";

// 导航项按当前语言指向对应前缀,英文页里点导航不会掉回中文站。
// 2026-08-08 重构阶段1:导航对应内容三分法(每日更新/文章/工具);
// 碎片(/notes)暂无内容,移出导航但路由保留,等有内容再回来。
const NAV = {
  zh: [
    { to: "/" as const, key: "nav.home" as const },
    { to: "/daily" as const, key: "nav.daily" as const },
    { to: "/resources" as const, key: "nav.articles" as const },
    { to: "/tools" as const, key: "nav.tools" as const },
    { to: "/about" as const, key: "nav.about" as const },
  ],
  en: [
    { to: "/en" as const, key: "nav.home" as const },
    { to: "/en/daily" as const, key: "nav.daily" as const },
    { to: "/en/resources" as const, key: "nav.articles" as const },
    { to: "/en/tools" as const, key: "nav.tools" as const },
    { to: "/en/about" as const, key: "nav.about" as const },
  ],
};

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdminStatus();
  const locale = useLocale();
  const t = useT();
  const navItems = NAV[locale];
  const home = locale === "en" ? ("/en" as const) : ("/" as const);
  const search = locale === "en" ? ("/en/search" as const) : ("/search" as const);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link to={home} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Library className="h-5 w-5 text-primary" />
            <span className="font-display">Mingyu's Library</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-primary font-medium" }}
                activeOptions={{ exact: item.to === "/" }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={search}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("nav.search")}
          >
            <Search className="h-4 w-4" />
          </Link>
          <LanguageSwitcher />
          <ThemeSwitch className="ml-1 hidden sm:inline-flex" />
          <NotificationBell />
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 md:inline-flex"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("nav.publish")}
                </Link>
              )}
              <Link
                to="/account"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t("nav.account")}
                title={t("nav.account")}
              >
                <UserIcon className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted md:inline-flex"
            >
              <UserIcon className="h-3.5 w-3.5" /> {t("nav.login")}
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border/50 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                activeProps={{ className: "text-primary font-medium" }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  我的账号
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium text-primary"
                  >
                    发布资源
                  </Link>
                )}
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-primary"
              >
                登录
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
