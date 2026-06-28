import { Link, useNavigate } from "@tanstack/react-router";
import { Library, Menu, X, Search, Plus, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { to: "/" as const, label: "首页" },
  { to: "/resources" as const, label: "资源库" },
  { to: "/notes" as const, label: "碎片" },
  { to: "/about" as const, label: "关于" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();


  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
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
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            to="/search"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="搜索"
          >
            <Search className="h-4 w-4" />
          </Link>
          {user ? (
            <>
              <Link
                to="/admin"
                className="hidden items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 md:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" /> 发布
              </Link>
              <Link
                to="/account"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="我的账号"
                title="我的账号"
              >
                <UserIcon className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted md:inline-flex"
            >
              <UserIcon className="h-3.5 w-3.5" /> 登录
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
                {item.label}
              </Link>
            ))}
            {user ? (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-primary"
              >
                发布资源
              </Link>
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
