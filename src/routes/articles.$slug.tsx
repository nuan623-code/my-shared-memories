import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, ExternalLink, MessageSquarePlus, MessageSquareOff, Clock, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ReadingStatusButtons } from "@/components/ReadingStatusButtons";
import { absUrl, SHARE_IMAGE } from "@/lib/site";
import { ShareButton } from "@/components/ShareButton";
import { DownloadMenu } from "@/components/DownloadMenu";
import { LikeButton } from "@/components/LikeButton";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchResourceBySlug, fetchResources, fetchTranslations, formatDate } from "@/lib/resources";
import { fetchAdjacentArticles, fetchRelatedArticles, fetchSeriesAdjacent, isDatedSeries, seriesAdjacentFrom } from "@/lib/related";
import { useAuth } from "@/hooks/use-auth";
import { trackView } from "@/lib/views";
import { readingMinutes } from "@/lib/article-utils";
import type { Resource } from "@/lib/resources";
import { Comments } from "@/components/Comments";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { HighlightLayer } from "@/components/HighlightLayer";
import { SuiReadPromo } from "@/components/SuiReadPromo";


export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const article = await fetchResourceBySlug(params.slug);
    if (!article) throw notFound();
    // 有译文版本时要在 head 里 hreflang 互指(中英 slug 可能不同,必须查出来)
    const alts = await fetchTranslations(article.i18n_key);
    return { article, alts };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const alts = loaderData?.alts ?? [];
    const title = `${a?.title ?? "文章"} — Mingyu's Library`;
    const description = (a?.summary || a?.title || "Mingyu 的文章与笔记").slice(0, 200);
    // OG/canonical 必须绝对 URL;og:image 用静态 PNG(SVG 会被所有社交爬虫忽略)
    const url = absUrl(`/articles/${params.slug}`);
    const ogImage = SHARE_IMAGE;
    // 站内静态 HTML 文档以直链为规范地址(正文在 iframe 里,爬虫按直链索引全文)
    const canonical =
      a?.url && a.url.startsWith("/") && a.url.endsWith(".html") ? absUrl(a.url) : url;
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
        { property: "og:image:width", content: "1024" },
        { property: "og:image:height", content: "1024" },
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
      links: [
        { rel: "canonical", href: canonical },
        // 仅当该内容确有另一语言版本时输出 hreflang(单语页输出会被判为错误配置)
        ...(alts.length > 1
          ? [
              ...alts.map((t) => ({
                rel: "alternate",
                hreflang: t.lang === "en" ? "en" : "zh-Hans",
                href: absUrl(t.lang === "en" ? `/en/articles/${t.slug}` : `/articles/${t.slug}`),
              })),
              {
                rel: "alternate",
                hreflang: "x-default",
                href: absUrl(
                  `/articles/${alts.find((t) => t.lang !== "en")?.slug ?? params.slug}`,
                ),
              },
            ]
          : []),
      ],
    };
  },
  component: function ArticleRoute() {
    const { article } = Route.useLoaderData();
    return <ArticleDetailPage article={article} />;
  },
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">文章不存在</div>
  ),
});

type TocItem = { id: string; text: string; level: number; no?: string; parent?: string };

// 站点目录统一格式:去掉文档标题里的 emoji 和各家自带编号(01 / ① / 一、 / SECTION 1 / Part 1 …),
// 编号改由外壳按 h2 顺序统一生成,保证 30+ 篇来源各异的文档目录观感一致。
function cleanTocText(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  // emoji(含变体选择符/零宽连接符/杂项符号区)
  t = t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{2460}-\u{24FF}]/gu, " ");
  t = t.replace(/\s+/g, " ").trim();
  // 明确的编号前缀才剥离;纯数字开头的正文(如「30 秒速览」)不受影响
  t = t.replace(/^(?:section|part)\s*\d+\s*[·.、::–—-]?\s*/i, "");
  t = t.replace(/^0\d\s*[·.、::–—-]?\s*/, "");
  t = t.replace(/^\d{1,2}\s*[·.、::]\s*/, "");
  t = t.replace(/^[一二三四五六七八九十]+[、.]\s*/, "");
  t = t.replace(/^第[一二三四五六七八九十0-9]+[章节部分]\s*[::·]?\s*/, "");
  // 残留的孤立分隔符
  t = t.replace(/^[\s·•::–—-]+/, "").trim();
  return t;
}

// 组件接 props 而非 Route.useLoaderData(),这样 /en/articles/$slug 能复用同一个组件
// (Route 是模块级常量,直接复用会读到中文路由的 loader)。
export function ArticleDetailPage({ article }: { article: Resource }) {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const [annotationsOn, setAnnotationsOn] = useState<boolean>(true);
  const [annotationsHydrated, setAnnotationsHydrated] = useState(false);
  const [tocOpen, setTocOpen] = useState<boolean>(true);
  const [adjacent, setAdjacent] = useState<{ prev: Resource | null; next: Resource | null }>({ prev: null, next: null });
  // 每日连载栏目(简报/深度学习)的前一天、后一天
  const [series, setSeries] = useState<{ prev: Resource | null; next: Resource | null; inSeries: boolean }>({ prev: null, next: null, inSeries: false });
  // iframe 每次载入完自增,让键盘监听重新挂到新的 contentDocument 上
  const [frameLoads, setFrameLoads] = useState(0);
  const navigate = useNavigate();
  const [related, setRelated] = useState<Resource[]>([]);
  // 静态文档的正文在 iframe 里、库里 content 为空,先按摘要估,iframe 载入后用真实正文重算
  const [docMins, setDocMins] = useState<number | null>(null);
  const mins = docMins ?? readingMinutes(article.content || article.summary || article.title || "");
  useEffect(() => {
    const stored = window.localStorage.getItem("annotationsOn");
    if (stored !== null) setAnnotationsOn(stored !== "0");
    const tocStored = window.localStorage.getItem("tocOpen");
    if (tocStored !== null) setTocOpen(tocStored !== "0");
    setAnnotationsHydrated(true);
  }, []);
  const toggleToc = () =>
    setTocOpen((v) => {
      const next = !v;
      try {
        window.localStorage.setItem("tocOpen", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  useEffect(() => {
    if (!annotationsHydrated) return;
    window.localStorage.setItem("annotationsOn", annotationsOn ? "1" : "0");
  }, [annotationsOn, annotationsHydrated]);
  useEffect(() => {
    trackView(article.id, user?.id ?? null).catch(() => {});
    fetchAdjacentArticles(article).then(setAdjacent).catch(() => {});
    fetchSeriesAdjacent(article).then(setSeries).catch(() => {});
    fetchRelatedArticles(article).then(setRelated).catch(() => {});
  }, [article, user?.id]);

  // 全量列表:既为返回资料库时预热缓存,也用来就地算同栏目的前后一天
  const { data: allResources } = useQuery({
    queryKey: ["resources", "all"],
    queryFn: () => fetchResources({}),
  });

  // 连载栏目走同栏目的前后一天,其余文章沿用全库的上一篇/下一篇。
  // 全量列表已被预取,命中缓存时先就地算一份,免得翻页按钮和快捷键要等一次网络往返
  // (连按 ← 时第二下常常落在查询还没回来的空档里,会被吞掉)。
  const inSeries = isDatedSeries(article);
  const cachedSeries = useMemo(
    () => (allResources ? seriesAdjacentFrom(allResources, article) : null),
    [allResources, article],
  );
  const effectiveSeries = series.inSeries ? series : cachedSeries;
  const navPrev = inSeries ? (effectiveSeries?.prev ?? null) : adjacent.prev;
  const navNext = inSeries ? (effectiveSeries?.next ?? null) : adjacent.next;
  const prevLabel = inSeries ? "前一天" : "上一篇";
  const nextLabel = inSeries ? "后一天" : "下一篇";

  // ← / → 翻页。正文在 iframe 里,焦点落进去后按键不冒泡到外层 document,
  // 所以同源的 contentDocument 上要单独再挂一份。
  useEffect(() => {
    const go = (target: Resource | null) => {
      if (!target?.slug) return false;
      navigate({ to: "/articles/$slug", params: { slug: target.slug } });
      return true;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      // 输入框/评论框/批注框里按方向键是移动光标,不能抢
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const back = e.key === "ArrowLeft" || e.key === "[";
      const fwd = e.key === "ArrowRight" || e.key === "]";
      if (!back && !fwd) return;
      if (go(back ? navPrev : navNext)) e.preventDefault();
    };
    const handler = onKey as EventListener;
    window.addEventListener("keydown", handler);
    let doc: Document | null = null;
    try {
      doc = iframeRef.current?.contentDocument ?? null;
    } catch {
      doc = null; // 跨域 iframe(站外链接)读不到,忽略
    }
    doc?.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      doc?.removeEventListener("keydown", handler);
    };
  }, [navPrev, navNext, navigate, frameLoads]);




  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !article.url) return;

    setFrameHeight(null);
    let ro: ResizeObserver | null = null;
    let winScroll: (() => void) | null = null;
    let winResize: (() => void) | null = null;

    const onLoad = () => {
      setFrameLoads((n) => n + 1); // 通知键盘监听重新挂到新文档上
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) return;

        const bodyText = doc.body?.innerText ?? "";
        if (bodyText.length > 200) setDocMins(readingMinutes(bodyText));

        // 目录归站点外壳管:隐藏文章 HTML 自带的悬浮目录/进度条/切换按钮,
        // 避免它们在自适应高度 iframe 里因 position:fixed 失去参照而出框、和外壳目录重复。
        // 同时注入媒体溢出兜底:存量文章的宽 SVG/表格/代码块在窄屏会把正文顶出横向滚动。
        if (!doc.getElementById("__host-hide-chrome")) {
          const style = doc.createElement("style");
          style.id = "__host-hide-chrome";
          style.textContent = [
            // .doc-chrome 是通用出口:新文档只要给自带的进度条/目录/主题切换加这个 class,
            // 嵌入站内时就会让位给外壳的同类组件(独立打开该 HTML 时仍然可用)。
            ".side-toc,.toc-toggle,.toc-btn,.top-progress,.doc-chrome{display:none!important}",
            // 侧栏被隐藏后,两列栅格的第一列仍占位,正文会被挤进那一列(实测 216px)。
            // 凡是直接包含被隐藏侧栏的栅格容器,嵌入时一律退回单列。
            "*:has(> .doc-chrome),*:has(> .side-toc){display:block!important}",
            // 老文章给自带悬浮目录预留的 margin-left(calc/262px/300px/330px 等),
            // 目录被隐藏后会变成纯留白把正文挤窄——嵌入时统一居中。
            // 大屏时文章内列统一放宽:多数老文档自限 1050px 以内,在 1600px 外壳里显小。
            ".wrap,.main,.container{max-width:min(1240px,100%)!important;margin-left:auto!important;margin-right:auto!important}",
            "img,video{max-width:100%;height:auto}",
            "svg{max-width:100%;height:auto}",
            "table{display:block;max-width:100%;overflow-x:auto}",
            "pre{max-width:100%;overflow-x:auto}",
            // iframe 高度已完全自适应内容,禁掉文档级滚动:
            // 高度测量的 2px 容差会让内容略高于框,外接鼠标时 macOS 显示第二根滚动条。
            "html,body{overflow:hidden!important}",
          ].join("");
          (doc.head || doc.documentElement).appendChild(style);
        }

        const headings = Array.from(doc.querySelectorAll("h2, h3"));
        const items: TocItem[] = [];
        let h2Count = 0;
        let lastH2Id: string | undefined;
        headings.forEach((h, i) => {
          const id = h.id || `heading-${i}`;
          if (!h.id) h.id = id;
          const level = h.tagName === "H2" ? 2 : 3;
          const text = cleanTocText(h.textContent ?? "");
          if (!text) return; // 清洗后为空(纯 emoji/编号标题)不进目录
          if (level === 2) {
            h2Count++;
            lastH2Id = id;
          }
          items.push({
            id,
            text,
            level,
            no: level === 2 ? String(h2Count).padStart(2, "0") : undefined,
            parent: level === 3 ? lastH2Id : undefined,
          });
        });
        setToc(items);

        // 标题位置缓存:iframe 无内部滚动,标题距 iframe 顶的距离只在重排时变。
        // 滚动帧里只读一次 iframe 自身的 rect,避免逐标题 getBoundingClientRect 造成掉帧。
        const headingTops = new Map<string, number>();
        const cacheHeadings = () => {
          headingTops.clear();
          for (const item of items) {
            const el = doc.getElementById(item.id);
            if (el) headingTops.set(item.id, el.getBoundingClientRect().top);
          }
        };

        // 让 iframe 高度自适应文章内容:文章随整页滚动,而不是挤在小窗口里。
        const measure = () => {
          const h = Math.max(
            doc.documentElement.scrollHeight,
            doc.body.scrollHeight,
          );
          if (h) setFrameHeight((prev) => (prev && Math.abs(prev - h) < 2 ? prev : h));
          cacheHeadings();
        };
        // 宽度变化后内容会重排,需在重排结束后再测一次(rAF + 延时兜底)。
        const measureSoon = () => {
          measure();
          win.requestAnimationFrame(measure);
          window.setTimeout(measure, 200);
        };
        measureSoon();
        const RO = (win as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
        if (RO) {
          ro = new RO(measure);
          ro.observe(doc.body);
          ro.observe(doc.documentElement);
        }
        winResize = measureSoon;
        window.addEventListener("resize", winResize);
        // 晚加载的字体 / 图片 / SVG 动画会改变高度,头几秒兜底重测。
        [300, 800, 1600].forEach((t) => window.setTimeout(measure, t));

        // iframe 已无内部滚动,阅读进度/当前标题改由外层页面滚动驱动。
        // rAF + pending 标志:每帧最多算一次;帧内只读 iframe 一个 rect + 查缓存。
        let scrollPending = false;
        const onScrollFrame = () => {
          scrollPending = false;
          const rect = iframe.getBoundingClientRect();
          const vh = window.innerHeight;
          const total = rect.height - vh;
          const scrolled = -rect.top;
          const p = total > 0 ? (scrolled / total) * 100 : rect.top <= 0 ? 100 : 0;
          const rounded = Math.round(Math.min(100, Math.max(0, p)));
          setProgress((prev) => (prev === rounded ? prev : rounded));

          let current: string | null = null;
          for (const item of items) {
            const top = headingTops.get(item.id);
            if (top !== undefined && top + rect.top <= 120) current = item.id;
          }
          setActiveId((prev) => (prev === current ? prev : current));
        };
        winScroll = () => {
          if (scrollPending) return;
          scrollPending = true;
          window.requestAnimationFrame(onScrollFrame);
        };
        window.addEventListener("scroll", winScroll, { passive: true });
        winScroll();
      } catch {
        // ignore cross-origin or other errors
      }
    };

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
      if (ro) ro.disconnect();
      if (winScroll) window.removeEventListener("scroll", winScroll);
      if (winResize) window.removeEventListener("resize", winResize);
    };
  }, [article.url]);

  const jumpTo = (id: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const el = doc.getElementById(id);
      if (!el) return;
      // iframe 自适应高度、无内部滚动:元素在 iframe 内的 top 即它距 iframe 顶的距离,
      // 加上 iframe 在外层页面的绝对位置,再滚外层 window(留出顶部粘性条的空间)。
      const iframeTop = iframe.getBoundingClientRect().top + window.scrollY;
      const elTop = el.getBoundingClientRect().top;
      window.scrollTo({ top: iframeTop + elTop - 80, behavior: "smooth" });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Reading progress bar:fixed 到视口最顶层(Header 也是 sticky top-0,
          原先 sticky 进度条被压在 Header 底下几乎不可见) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 目录收起时的悬浮展开按钮:顶栏按钮会随滚动离开视口,
          读者读到中途想打开目录必须能随手够到。 */}
      {toc.length > 0 && !tocOpen && (
        <button
          type="button"
          onClick={toggleToc}
          title="展开目录"
          className="fixed left-3 top-24 z-40 hidden items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur transition-colors hover:text-foreground lg:flex"
        >
          <PanelLeftOpen className="h-4 w-4" /> 目录
        </button>
      )}

      {/* Top action bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>

            {/* 前后翻页:每日栏目按天翻,其余按收录时间翻。快捷键 ← / →。
                窄屏不显示——顶栏本来就已经挤到换行,且手机没键盘,翻页走正文末尾的前后卡片。 */}
            {(navPrev || navNext) && (
              <div className="hidden shrink-0 items-center overflow-hidden rounded-md border border-border sm:flex">
                {navPrev ? (
                  <Link
                    to="/articles/$slug"
                    params={{ slug: navPrev.slug! }}
                    title={`${prevLabel}(←):${navPrev.title ?? ""}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{prevLabel}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/40">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{prevLabel}</span>
                  </span>
                )}
                <span className="h-4 w-px bg-border" />
                {navNext ? (
                  <Link
                    to="/articles/$slug"
                    params={{ slug: navNext.slug! }}
                    title={`${nextLabel}(→):${navNext.title ?? ""}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="hidden sm:inline">{nextLabel}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/40">
                    <span className="hidden sm:inline">{nextLabel}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            )}

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> 约 {mins} 分钟
            </span>
            {/* 收录/更新时间(同日只显示收录) */}
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <CalendarDays className="h-3.5 w-3.5" />
              收录于 {formatDate(article.published_at)}
              {article.updated_at &&
                article.updated_at.slice(0, 10) !== article.published_at.slice(0, 10) && (
                  <> · 更新于 {formatDate(article.updated_at)}</>
                )}
            </span>
            <LikeButton resourceId={article.id} />
            <ReadingStatusButtons resourceId={article.id} showLabel />
            <ShareButton title={article.title ?? "Mingyu's Library"} url={absUrl(`/articles/${article.slug}`)} />
          </div>

          <div className="flex items-center gap-3">
            {toc.length > 0 && (
              <button
                type="button"
                onClick={toggleToc}
                className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground lg:inline-flex"
                title={tocOpen ? "收起目录" : "展开目录"}
              >
                {tocOpen ? (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                )}
                {tocOpen ? "收起目录" : "目录"}
              </button>
            )}
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
      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-6">
        {/* Left TOC (站点外壳统一目录,跟随整页滚动;可收起,状态记忆在 localStorage) */}
        {toc.length > 0 && tocOpen && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto pr-1">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  目录
                </span>
                <button
                  type="button"
                  onClick={toggleToc}
                  title="收起目录"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="space-y-0.5">
                {(() => {
                  // 简化目录:h2 常驻;h3 只在「当前阅读的章节」下展开(手风琴),
                  // 避免长文档目录全量平铺过长。无 h2 的文档退回全量显示。
                  const active = toc.find((t) => t.id === activeId);
                  const activeParent = active
                    ? active.level === 2
                      ? active.id
                      : active.parent
                    : toc.find((t) => t.level === 2)?.id;
                  const hasH2 = toc.some((t) => t.level === 2);
                  return toc.filter(
                    (t) => t.level === 2 || !hasH2 || t.parent === activeParent,
                  );
                })().map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(item.id)}
                      style={{ paddingLeft: item.level === 3 ? 14 : 0 }}
                      className={`block w-full truncate text-left text-sm leading-6 transition-colors hover:text-foreground ${
                        activeId === item.id
                          ? "font-medium text-primary"
                          : "text-muted-foreground"
                      }`}
                      title={item.text}
                    >
                      {item.no && (
                        <span className="mr-1.5 text-[10px] tabular-nums text-muted-foreground/70">
                          {item.no}
                        </span>
                      )}
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}

        {/* Right content */}
        <div className="min-w-0 flex-1">
          {(() => {
            const isExternal = !!article.url && /^https?:\/\//i.test(article.url);
            const useSrcDoc = isExternal && !!article.content;
            const useLocalSrc = !!article.url && !isExternal;
            if (useSrcDoc || useLocalSrc) {
              return (
                <div className="relative">
                  {annotationsOn && (
                    <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
                      <span>
                        选中正文中任意文字,即可弹出「高亮 / 评论」工具条。
                      </span>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    {...(useSrcDoc
                      ? { srcDoc: article.content as string }
                      : { src: article.url as string })}
                    title={article.title ?? ""}
                    referrerPolicy="no-referrer"
                    className="block w-full bg-white"
                    style={{ height: frameHeight ? `${frameHeight}px` : "calc(100vh - 10rem)" }}
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                  {/* 段落「+」批注层已移除:一次渲染近百个按钮且随滚动整层重渲染,
                      是阅读卡顿主因;划词高亮/评论(SelectionToolbar)保留。 */}
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

          <SuiReadPromo
            url={
              article.url && !/^https?:\/\//i.test(article.url)
                ? article.url
                : undefined
            }
            title={article.title ?? undefined}
          />

          {(navPrev || navNext) && (
            <nav className="mt-8 grid gap-3 sm:grid-cols-2">
              {navPrev ? (
                <Link to="/articles/$slug" params={{ slug: navPrev.slug! }}
                  className="group rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3 w-3" /> {prevLabel}<span className="ml-1 opacity-60">←</span></div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">{navPrev.title}</div>
                </Link>
              ) : <div />}
              {navNext ? (
                <Link to="/articles/$slug" params={{ slug: navNext.slug! }}
                  className="group rounded-lg border border-border bg-card p-4 text-right transition hover:border-primary/40 hover:bg-muted/50">
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><span className="mr-1 opacity-60">→</span>{nextLabel} <ChevronRight className="h-3 w-3" /></div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">{navNext.title}</div>
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
