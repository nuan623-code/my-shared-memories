import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MessageSquarePlus, MessageSquareOff, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { DownloadMenu } from "@/components/DownloadMenu";
import { LikeButton } from "@/components/LikeButton";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchResourceBySlug, fetchResources } from "@/lib/resources";
import { fetchAdjacentArticles, fetchRelatedArticles } from "@/lib/related";
import { useAuth } from "@/hooks/use-auth";
import { trackView } from "@/lib/views";
import { readingMinutes } from "@/lib/article-utils";
import type { Resource } from "@/lib/resources";
import { Comments } from "@/components/Comments";
import { ParagraphCommentLayer } from "@/components/ParagraphCommentLayer";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { HighlightLayer } from "@/components/HighlightLayer";


export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const article = await fetchResourceBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const title = `${a?.title ?? "文章"} — Mingyu's Library`;
    const description = (a?.summary || a?.title || "Mingyu 的文章与笔记").slice(0, 200);
    const url = `/articles/${params.slug}`;
    const ogImage = `/api/og/articles/${params.slug}`;
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
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: a?.title ?? "Mingyu's Library" },
        { property: "og:site_name", content: "Mingyu's Library" },
        ...(a?.published_at ? [{ property: "article:published_time", content: new Date(a.published_at).toISOString() }] : []),
        ...(a?.updated_at ? [{ property: "article:modified_time", content: new Date(a.updated_at).toISOString() }] : []),
        ...(a?.category ? [{ property: "article:section", content: a.category }] : []),
        ...((a?.tags ?? []).map((t) => ({ property: "article:tag", content: t }))),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [annotationsOn, setAnnotationsOn] = useState<boolean>(true);
  const [annotationsHydrated, setAnnotationsHydrated] = useState(false);
  const [adjacent, setAdjacent] = useState<{ prev: Resource | null; next: Resource | null }>({ prev: null, next: null });
  const [related, setRelated] = useState<Resource[]>([]);
  const mins = readingMinutes(article.content || article.summary || article.title || "");
  useEffect(() => {
    const stored = window.localStorage.getItem("annotationsOn");
    if (stored !== null) setAnnotationsOn(stored !== "0");
    setAnnotationsHydrated(true);
  }, []);
  useEffect(() => {
    if (!annotationsHydrated) return;
    window.localStorage.setItem("annotationsOn", annotationsOn ? "1" : "0");
  }, [annotationsOn, annotationsHydrated]);
  useEffect(() => {
    trackView(article.id, user?.id ?? null).catch(() => {});
    fetchAdjacentArticles(article).then(setAdjacent).catch(() => {});
    fetchRelatedArticles(article).then(setRelated).catch(() => {});
  }, [article, user?.id]);




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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> 约 {mins} 分钟
            </span>
            <LikeButton resourceId={article.id} />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAnnotationsOn((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              title={annotationsOn ? "隐藏段落批注标记" : "显示段落批注标记"}
            >
              {annotationsOn ? (
                <MessageSquareOff className="h-3.5 w-3.5" />
              ) : (
                <MessageSquarePlus className="h-3.5 w-3.5" />
              )}
              {annotationsOn ? "隐藏批注" : "显示批注"}
            </button>
            {article.url && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main layout: left TOC + right content */}
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
        {/* Right content */}
        <div className="min-w-0 flex-1">
          {(() => {
            const isExternal = !!article.url && /^https?:\/\//i.test(article.url);
            const useSrcDoc = isExternal && !!article.content;
            const useLocalSrc = !!article.url && !isExternal;
            if (useSrcDoc || useLocalSrc) {
              return (
                <div className="relative">
                  <iframe
                    ref={iframeRef}
                    {...(useSrcDoc
                      ? { srcDoc: article.content as string }
                      : { src: article.url as string })}
                    title={article.title ?? ""}
                    referrerPolicy="no-referrer"
                    className="h-[calc(100vh-10rem)] w-full rounded-lg border border-border bg-white"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                  <ParagraphCommentLayer
                    resourceId={article.id}
                    iframeRef={iframeRef}
                    enabled={annotationsOn}
                  />
                  <HighlightLayer
                    resourceId={article.id}
                    iframeRef={iframeRef}
                    enabled={annotationsOn}
                  />
                  <SelectionToolbar
                    resourceId={article.id}
                    iframeRef={iframeRef}
                    enabled={annotationsOn}
                  />
                </div>
              );
            }
            return null;
          })() || (
            <div className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-8">
              <h1>{article.title}</h1>
              <p className="text-muted-foreground">{article.summary}</p>
              <div className="whitespace-pre-wrap">{article.content}</div>
            </div>
          )}

          {(adjacent.prev || adjacent.next) && (
            <nav className="mt-8 grid gap-3 sm:grid-cols-2">
              {adjacent.prev ? (
                <Link to="/articles/$slug" params={{ slug: adjacent.prev.slug! }}
                  className="group rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3 w-3" /> 上一篇</div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">{adjacent.prev.title}</div>
                </Link>
              ) : <div />}
              {adjacent.next ? (
                <Link to="/articles/$slug" params={{ slug: adjacent.next.slug! }}
                  className="group rounded-lg border border-border bg-card p-4 text-right transition hover:border-primary/40 hover:bg-muted/50">
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">下一篇 <ChevronRight className="h-3 w-3" /></div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">{adjacent.next.title}</div>
                </Link>
              ) : <div />}
            </nav>
          )}

          {related.length > 0 && (
            <section className="mt-8 rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">相关推荐</h3>
              <div className="grid gap-2">
                {related.map((r) => (
                  <Link key={r.id} to="/articles/$slug" params={{ slug: r.slug! }}
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/50 hover:text-foreground">
                    <span className="line-clamp-1 flex-1">{r.title}</span>
                    {r.tags?.[0] && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{r.tags[0]}</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8">
            <Comments resourceId={article.id} />
          </div>
        </div>
      </div>

    </div>
  );
}
