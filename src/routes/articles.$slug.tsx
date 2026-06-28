import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, List, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { articles, getArticleById } from "@/lib/data";


export const Route = createFileRoute("/articles/$slug")({
  component: ArticleDetailPage,
  loader: ({ params }) => {
    const article = getArticleById(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData, params }) => {
    const article = loaderData?.article;
    const title = `${article?.title ?? "文章"} — Mingyu Yang`;
    const description =
      article?.description ||
      `${article?.title ?? ""} - Mingyu Yang 的文章与笔记`;
    const url = `/articles/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "author", content: "Mingyu Yang" },
        ...(article?.tags?.length
          ? [{ name: "keywords", content: article.tags.join(", ") }]
          : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Mingyu Yang" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article?.title,
            description,
            author: { "@type": "Person", name: "Mingyu Yang" },
            keywords: article?.tags?.join(", "),
            datePublished: article?.date || undefined,
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },

});

type TocItem = { id: string; text: string; level: 2 | 3 };

function ArticleDetailPage() {
  const { article } = Route.useLoaderData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(true);
  const [progress, setProgress] = useState(0);

  // 解析 iframe 内的 H2/H3，生成目录
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !article.link) return;

    const buildToc = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const headings = Array.from(doc.querySelectorAll("h2, h3"));
        const items: TocItem[] = headings.map((el, i) => {
          let id = el.id;
          if (!id) {
            id = `toc-heading-${i}`;
            el.id = id;
          }
          return {
            id,
            text: (el.textContent ?? "").trim(),
            level: el.tagName === "H2" ? 2 : 3,
          };
        });
        setToc(items);

        // 监听 iframe 滚动以高亮当前条目
        const win = iframe.contentWindow;
        if (!win) return;
        const onScroll = () => {
          const docEl = doc.documentElement;
          const scrollTop = docEl.scrollTop || doc.body.scrollTop;
          const scrollHeight = (docEl.scrollHeight || doc.body.scrollHeight) - win.innerHeight;
          const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
          setProgress(pct);

          let current = "";
          for (const it of items) {
            const el = doc.getElementById(it.id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top <= 80) current = it.id;
            else break;
          }
          if (current) setActiveId(current);
        };
        win.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => win.removeEventListener("scroll", onScroll);
      } catch {
        // 跨域时静默失败
        setToc([]);
      }
    };

    let cleanup: (() => void) | undefined;
    const handleLoad = () => {
      cleanup?.();
      cleanup = buildToc();
    };
    iframe.addEventListener("load", handleLoad);
    // 若已加载完成则立刻构建
    if (iframe.contentDocument?.readyState === "complete") handleLoad();

    return () => {
      iframe.removeEventListener("load", handleLoad);
      cleanup?.();
    };
  }, [article.link]);

  const jumpTo = (id: string) => {
    const doc = iframeRef.current?.contentDocument;
    const el = doc?.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* 阅读进度条 */}
      <div
        className="sticky top-0 z-20 h-1 w-full bg-border/40"
        role="progressbar"
        aria-label="阅读进度"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* 顶部工具栏 */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回文章列表
          </Link>
          <div className="flex items-center gap-4">
            {toc.length > 0 && (
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              >
                <List className="h-4 w-4" />
                目录
              </button>
            )}
            {article.link && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                在 GitHub Pages 打开
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 主体：iframe + 目录 */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-4">
        <div className="flex-1">
          {article.link ? (
            <iframe
              ref={iframeRef}
              src={article.link}
              title={article.title}
              className="h-[calc(100vh-8rem)] w-full rounded-lg border border-border bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="flex h-96 items-center justify-center text-muted-foreground">
              暂无外部链接
            </div>
          )}
        </div>

        {/* 目录侧栏 */}
        {toc.length > 0 && tocOpen && (
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-auto rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <List className="h-4 w-4 text-primary" />
                目录
              </div>
              <nav className="space-y-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(item.id)}
                    className={`block w-full truncate text-left text-sm transition-colors ${
                      item.level === 3 ? "pl-4" : ""
                    } ${
                      activeId === item.id
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={item.text}
                  >
                    {item.text || "（无标题）"}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
