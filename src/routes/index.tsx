import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Library,
  FileText,
  Video,
  Link as LinkIcon,
  Paperclip,
  StickyNote,
  Sparkles,
  Clock,
  Tag,
  Compass,
} from "lucide-react";
import { fetchResources, RESOURCE_TYPE_LABELS, type ResourceType, type Resource } from "@/lib/resources";
import { ResourceMasonry } from "@/components/ResourceMasonry";

const resourcesQO = queryOptions({
  queryKey: ["resources", "home"],
  queryFn: () => fetchResources({ limit: 60 }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mingyu's Library — 个人资源库" },
      { name: "description", content: "Mingyu 的个人资源库：文章、视频、外链、文件与碎片笔记。" },
      { property: "og:title", content: "Mingyu's Library" },
      { property: "og:description", content: "Mingyu 想分享的任何东西" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      加载资源失败：{error.message}
    </div>
  ),
});

const TYPE_META: Record<ResourceType, { label: string; icon: typeof FileText }> = {
  article: { label: RESOURCE_TYPE_LABELS.article, icon: FileText },
  video: { label: RESOURCE_TYPE_LABELS.video, icon: Video },
  link: { label: RESOURCE_TYPE_LABELS.link, icon: LinkIcon },
  file: { label: RESOURCE_TYPE_LABELS.file, icon: Paperclip },
  note: { label: RESOURCE_TYPE_LABELS.note, icon: StickyNote },
};

const TYPE_FILTERS: { id: ResourceType | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "article", label: RESOURCE_TYPE_LABELS.article },
  { id: "video", label: RESOURCE_TYPE_LABELS.video },
  { id: "link", label: RESOURCE_TYPE_LABELS.link },
  { id: "file", label: RESOURCE_TYPE_LABELS.file },
  { id: "note", label: RESOURCE_TYPE_LABELS.note },
];

function resourceHref(r: Resource): string {
  if (r.type === "article" && r.slug) return `/articles/${r.slug}`;
  if (r.url) return r.url;
  return "/resources";
}

function HomePage() {
  const { data: resources } = useSuspenseQuery(resourcesQO);
  const [filter, setFilter] = useState<ResourceType | "all">("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: resources.length };
    for (const r of resources) c[r.type] = (c[r.type] || 0) + 1;
    return c;
  }, [resources]);

  const featured = useMemo(() => resources.slice(0, 3), [resources]);

  const topTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resources) for (const t of r.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [resources]);

  const lastUpdated = useMemo(() => {
    if (!resources.length) return null;
    const d = new Date(resources[0].published_at);
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  }, [resources]);

  const filtered = useMemo(
    () => (filter === "all" ? resources : resources.filter((r) => r.type === filter)),
    [resources, filter],
  );

  return (
    <div className="flex flex-col">
      {/* Hero with decorative blobs */}
      <section className="relative overflow-hidden border-b border-border/50 px-4 py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/20" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Library className="h-3.5 w-3.5 text-primary" />
            Mingyu's Library — 个人资源库
            {lastUpdated && (
              <>
                <span className="mx-1 h-3 w-px bg-border" />
                <Clock className="h-3 w-3" />
                <span>更新于 {lastUpdated}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            我想记录、分享的
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              任何东西
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm text-muted-foreground sm:text-base">
            文章笔记、教学视频、好用的工具、值得保存的文件、突然冒出来的想法 ——
            统一放在这里，随时翻阅。
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
            >
              <Compass className="h-4 w-4" />
              浏览全部资源
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              搜索一下
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(TYPE_META) as ResourceType[]).map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold leading-none text-foreground">
                      {counts[t] ?? 0}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{TYPE_META[t].label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured highlights */}
      {featured.length > 0 && (
        <section className="border-b border-border/50 px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  最近更新
                </div>
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">近期亮点</h2>
              </div>
              <Link
                to="/resources"
                className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
              >
                查看全部
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((r, i) => {
                const Icon = TYPE_META[r.type].icon;
                const href = resourceHref(r);
                const isExternal = href.startsWith("http");
                const inner = (
                  <article
                    className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg ${
                      i === 0 ? "lg:col-span-1" : ""
                    }`}
                  >
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Icon className="h-3 w-3" />
                          {TYPE_META[r.type].label}
                        </span>
                        {r.category && (
                          <span className="text-[11px] text-muted-foreground">{r.category}</span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 text-lg font-semibold text-foreground transition group-hover:text-primary">
                        {r.title || "未命名资源"}
                      </h3>
                      {r.summary && (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {r.summary}
                        </p>
                      )}
                    </div>
                    <div className="relative mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(r.published_at).toLocaleDateString("zh-CN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary opacity-0 transition group-hover:opacity-100">
                        阅读
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </article>
                );
                return isExternal ? (
                  <a key={r.id} href={href} target="_blank" rel="noreferrer">
                    {inner}
                  </a>
                ) : (
                  <Link key={r.id} to={href}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Type filter chips */}
      <section className="sticky top-[57px] z-30 border-b border-border/50 bg-background/85 px-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto py-3">
          {TYPE_FILTERS.map((t) => {
            const active = filter === t.id;
            const n = counts[t.id] ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
          <Link
            to="/resources"
            className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
          >
            进入完整资源库
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Masonry feed */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <ResourceMasonry resources={filtered} />
        </div>
      </section>

      {/* Tag cloud */}
      {topTags.length > 0 && (
        <section className="border-t border-border/50 px-4 py-12">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              <Tag className="h-3.5 w-3.5" />
              主题地图
            </div>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">按兴趣探索</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              从最常出现的话题切入，看看哪一条路适合你。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {topTags.map(([tag, n]) => {
                const size =
                  n >= 4 ? "text-base px-4 py-2" : n >= 2 ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1";
                return (
                  <Link
                    key={tag}
                    to="/search"
                    search={{ q: tag } as never}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card font-medium text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground ${size}`}
                  >
                    {tag}
                    <span className="text-[10px] opacity-60">{n}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA footer card */}
      <section className="px-4 pb-16 pt-4">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/15 p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
            aria-hidden
          />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                继续翻翻看？
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                这里持续在更新。如果你想找某个具体话题，直接搜索；想随便逛逛，进入完整资源库。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/resources"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
              >
                进入资源库
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40"
              >
                关于 Mingyu
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
