import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Download, ExternalLink, List } from "lucide-react";
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

type TocItem = { id: string; text: string; level: 2 | 3 };

function ArticleDetailPage() {
  const { article } = Route.useLoaderData();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !article.url) return;
    const build = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const items: TocItem[] = Array.from(doc.querySelectorAll("h2, h3")).map((el, i) => {
          let id = el.id;
          if (!id) {
            id = `h-${i}`;
            el.id = id;
          }
          return { id, text: (el.textContent ?? "").trim(), level: el.tagName === "H2" ? 2 : 3 };
        });
        setToc(items);
        const win = iframe.contentWindow!;
        const onScroll = () => {
          const docEl = doc.documentElement;
          const top = docEl.scrollTop || doc.body.scrollTop;
          const h = (docEl.scrollHeight || doc.body.scrollHeight) - win.innerHeight;
          setProgress(h > 0 ? Math.min(100, Math.max(0, (top / h) * 100)) : 0);
          let cur = "";
          for (const it of items) {
            const el = doc.getElementById(it.id);
            if (!el) continue;
            if (el.getBoundingClientRect().top <= 80) cur = it.id;
            else break;
          }
          if (cur) setActiveId(cur);
        };
        win.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => win.removeEventListener("scroll", onScroll);
      } catch {
        setToc([]);
      }
    };
    let cleanup: (() => void) | undefined;
    const onLoad = () => {
      cleanup?.();
      cleanup = build();
    };
    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
      cleanup?.();
    };
  }, [article.url]);

  const jumpTo = (id: string) => {
    const el = iframeRef.current?.contentDocument?.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

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
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(article.url!);
                    const blob = await res.blob();
                    const ext = article.url!.split(".").pop()?.split("?")[0] || "html";
                    const safe = (article.title || "article").replace(/[\\/:*?"<>|]/g, "_");
                    const a = document.createElement("a");
                    const href = URL.createObjectURL(blob);
                    a.href = href;
                    a.download = `${safe}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(href);
                  } catch {
                    window.open(article.url!, "_blank");
                  }
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                下载
              </button>
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

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-4">
        <div className="flex-1">
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

        {toc.length > 0 && (
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-auto rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <List className="h-4 w-4 text-primary" />
                目录
              </div>
              <nav className="space-y-1">
                {toc.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => jumpTo(it.id)}
                    className={`block w-full truncate text-left text-sm transition ${
                      it.level === 3 ? "pl-4" : ""
                    } ${
                      activeId === it.id
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {it.text || "（无标题）"}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-12">
        <Comments resourceId={article.id} />
      </div>
    </div>
  );
}
