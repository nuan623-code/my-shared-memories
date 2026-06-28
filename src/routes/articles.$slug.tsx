import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MessageSquarePlus, MessageSquareOff } from "lucide-react";
import { DownloadMenu } from "@/components/DownloadMenu";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchResourceBySlug, fetchResources } from "@/lib/resources";
import { Comments } from "@/components/Comments";
import { ParagraphCommentLayer } from "@/components/ParagraphCommentLayer";

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const article = await fetchResourceBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const title = `${a?.title ?? "文章"} — Mingyu's Library`;
    const description = a?.summary || a?.title || "Mingyu 的文章与笔记";
    const url = `/articles/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "author", content: "Mingyu Yang" },
        ...(a?.tags?.length ? [{ name: "keywords", content: a.tags.join(", ") }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ArticleDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">文章不存在</div>
  ),
});

type TocItem = { id: string; text: string; level: number };

function ArticleDetailPage() {
  const { article } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [annotationsOn, setAnnotationsOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("annotationsOn") !== "0";
  });
  useEffect(() => {
    window.localStorage.setItem("annotationsOn", annotationsOn ? "1" : "0");
  }, [annotationsOn]);

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["resources", "all"],
      queryFn: () => fetchResources({}),
    });
  }, [queryClient]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !article.url) return;

    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) return;

        const headings = Array.from(doc.querySelectorAll("h2, h3"));
        const items: TocItem[] = [];
        headings.forEach((h, i) => {
          const id = h.id || `heading-${i}`;
          if (!h.id) h.id = id;
          items.push({
            id,
            text: h.textContent?.trim() ?? "",
            level: h.tagName === "H2" ? 2 : 3,
          });
        });
        setToc(items);

        const onScroll = () => {
          const docEl = doc.documentElement;
          const top = docEl.scrollTop || doc.body.scrollTop;
          const h = (docEl.scrollHeight || doc.body.scrollHeight) - win.innerHeight;
          setProgress(h > 0 ? Math.min(100, Math.max(0, (top / h) * 100)) : 0);

          let current: string | null = null;
          for (const item of items) {
            const el = doc.getElementById(item.id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= 120) current = item.id;
            }
          }
          setActiveId(current);
        };

        win.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => win.removeEventListener("scroll", onScroll);
      } catch {
        // ignore cross-origin or other errors
      }
    };

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => iframe.removeEventListener("load", onLoad);
  }, [article.url]);

  const jumpTo = (id: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return;
      const el = doc.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Reading progress bar */}
      <div className="sticky top-0 z-20 h-1 w-full bg-border/40">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top action bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回资源库
          </Link>
          {article.url && (
            <div className="flex items-center gap-3">
              <DownloadMenu url={article.url} title={article.title ?? "article"} />
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
              >
                新标签打开
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main layout: left TOC + right content */}
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
        {/* Left sidebar TOC */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">{article.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">阅读导航</p>
            </div>
            <div className="h-1 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {Math.round(progress)}%
            </p>
            {toc.length > 0 ? (
              <nav className="mt-3 space-y-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => jumpTo(item.id)}
                    className={`block w-full text-left text-xs leading-relaxed transition-colors ${
                      activeId === item.id
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    } ${item.level === 3 ? "pl-3" : ""}`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">暂无目录</p>
            )}
          </div>
        </aside>

        {/* Right content */}
        <div className="min-w-0 flex-1">
          {article.url ? (
            <iframe
              ref={iframeRef}
              src={article.url}
              title={article.title ?? ""}
              className="h-[calc(100vh-10rem)] w-full rounded-lg border border-border bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-8">
              <h1>{article.title}</h1>
              <p className="text-muted-foreground">{article.summary}</p>
              <div className="whitespace-pre-wrap">{article.content}</div>
            </div>
          )}

          <div className="mt-8">
            <Comments resourceId={article.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
