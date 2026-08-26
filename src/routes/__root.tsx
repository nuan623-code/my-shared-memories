import "@fontsource-variable/outfit/wght.css";
import "@fontsource-variable/figtree/wght.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { localeFromPath, HTML_LANG } from "@/lib/i18n";

import appCss from "../styles.css?url";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const GA_MEASUREMENT_ID = "G-3GRX3Y2VQJ";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mingyu's Library — 个人资源库" },
      { name: "description", content: "Mingyu 的个人资源库：文章、视频、外链、文件与碎片笔记。" },
      { name: "author", content: "Mingyu Yang" },
      // iOS Safari 原生 Smart App Banner:装了随读显示「打开」,没装引导 App Store
      { name: "apple-itunes-app", content: "app-id=6788002593" },
      { property: "og:title", content: "Mingyu's Library" },
      { property: "og:description", content: "Mingyu 想分享的任何东西" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Mingyu's Library" },
      // 全站默认分享图(绝对 URL;OG 不接受相对路径,也不接受 SVG)
      { property: "og:image", content: "https://mingyuyang.com/share-card.png" },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1024" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "https://mingyuyang.com/share-card.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      // RSS 自动发现:阅读器只认 <head> 里的这一行(2026-08-26)
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Mingyu's Library",
        href: "/rss.xml",
      },
    ],
    scripts: [
      // 主题必须在首帧之前定下来,否则选了深色的人每次刷新都先闪一下白。
      // 键名 cc-theme 与学习站 site.js 是同一个,两站之间跳转不掉主题。
      // 只在手动档写 data-theme;system 档不写,交给 prefers-color-scheme。
      {
        children:
          `try{var m=localStorage.getItem('cc-theme');` +
          `if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m);}catch(e){}`,
      },
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false});`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // lang 必须 SSR 阶段就正确(爬虫据此判断页面语言)。
  // 纯函数派生自 pathname,服务端与客户端结果一致,不会 hydration mismatch。
  const locale = useRouterState({ select: (s) => localeFromPath(s.location.pathname) });
  return (
    // suppressHydrationWarning 只作用于 <html> 自身的属性:
    // data-theme 由 head 里那段 pre-hydration 脚本在 React 之前写上(服务端不可能知道
    // 用户存在 localStorage 里的选择),两边必然对不上。这是该属性的既定用法,
    // 不会掩盖子树里的任何 mismatch。
    <html lang={HTML_LANG[locale]} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // gtag config 关闭了自动 page_view(SPA 下只会记首次进入),
  // 这里首屏发一次,之后跟随路由变化补发
  useEffect(() => {
    const sendPageView = () => {
      window.gtag?.("event", "page_view", {
        page_path: window.location.pathname + window.location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    };
    sendPageView();
    return router.subscribe("onResolved", (event) => {
      if (event.pathChanged) sendPageView();
    });
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}
