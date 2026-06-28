import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DownloadMenu } from "@/components/DownloadMenu";
import { useEffect, useRef, useState } from "react";
import { fetchResourceBySlug } from "@/lib/resources";
import { Comments } from "@/components/Comments";

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

function ArticleDetailPage() {
  const { article } = Route.useLoaderData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !article.url) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) return;
        const onScroll = () => {
          const docEl = doc.documentElement;
          const top = docEl.scrollTop || doc.body.scrollTop;
          const h = (docEl.scrollHeight || doc.body.scrollHeight) - win.innerHeight;
          setProgress(h > 0 ? Math.min(100, Math.max(0, (top / h) * 100)) : 0);
        };
        win.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => win.removeEventListener("scroll", onScroll);
      } catch {
        // ignore
      }
    };
    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => iframe.removeEventListener("load", onLoad);
  }, [article.url]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="sticky top-0 z-20 h-1 w-full bg-border/40">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
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

      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        {article.url ? (
          <iframe
            ref={iframeRef}
            src={article.url}
            title={article.title ?? ""}
            className="h-[calc(100vh-8rem)] w-full rounded-lg border border-border bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-8">
            <h1>{article.title}</h1>
            <p className="text-muted-foreground">{article.summary}</p>
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-12">
        <Comments resourceId={article.id} />
      </div>
    </div>
  );
}
