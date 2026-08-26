import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Library,
  Sparkles,
  Clock,
  CalendarDays,
  Wrench,
  User,
} from "lucide-react";
import {
  fetchResources,
  resourceHref,
  isNew,
  contentDate,
  isDailyColumn,
  type Resource,
} from "@/lib/resources";
import { fetchTopViewed } from "@/lib/views";
import { computeSiteStats } from "@/lib/site-stats";
import { categories, catLabel } from "@/lib/data";
import { SubscribeCard } from "@/components/SubscribeCard";
import { ToolCard } from "@/components/ToolCard";
import { TOOLS } from "@/lib/tools";
import { DAILY_COLUMNS } from "@/lib/columns";
import { useT, useLocale } from "@/lib/i18n/use-t";
import { localizedPath, type Locale } from "@/lib/i18n";
import { i18nHead } from "@/lib/i18n/head";

// 取全量:曾经的 limit:60 会按时间倒序截断,把最老的公众号文章从首页挤掉
// (每日简报每天 +1,挤一篇老文)。Supabase 单请求上限 1000,足够用很久;
// 接近时再做分页。
export const resourcesQO = queryOptions({
  queryKey: ["resources", "home"],
  queryFn: () => fetchResources({}),
});

// 招牌精选(2026-08-26 改为半自动):前两格是人工钉选的门面,永远在;
// 后面几格自动补 —— 先按最近 30 天阅读量,不够再按内容日期补最新长文。
// 于是首页每周自然换血,不用再记得手动改数组。想换门面改 PINNED_SLUGS 即可。
const FEATURED_COUNT = 6;
const PINNED_SLUGS: Record<Locale, string[]> = {
  zh: ["ai-notes-multi-session-vs-multi-agent", "overseas-ios-first-launch-attribution"],
  en: ["ai-notes-multi-session-vs-multi-agent-en", "overseas-ios-first-launch-attribution"],
};

// 阅读量榜单单独取:挂了也只是退化成「按最新补位」,不能拖垮首页。
export const topViewedQO = queryOptions({
  queryKey: ["resources", "home", "topViewed"],
  queryFn: () => fetchTopViewed(30, 30).catch(() => []),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/")({
  head: () =>
    i18nHead({
      path: "/",
      locale: "zh",
      title: "Mingyu's Library — 每天讲透一个 AI 主题",
      description:
        "AI 简报、深度解读、Claude Code 实战课,三条内容线每日更新;外加手写长文与开发工具。",
    }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(resourcesQO),
      context.queryClient.ensureQueryData(topViewedQO),
    ]),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      加载资源失败:{error.message}
    </div>
  ),
});

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 招牌精选选片:钉选 → 30 天热读 → 最新长文,按序补满 FEATURED_COUNT。
 * 只从「手写长文」里挑(三个每日栏目有自己的今日更新条与栏目导览,不占精选位)。
 */
function pickFeatured(
  resources: Resource[],
  topViewed: Array<{ resource_id: string }>,
  locale: Locale,
): Resource[] {
  const picked: Resource[] = [];
  const seen = new Set<string>();
  const take = (r: Resource | undefined | null) => {
    if (!r || seen.has(r.id) || picked.length >= FEATURED_COUNT) return;
    seen.add(r.id);
    picked.push(r);
  };

  for (const slug of PINNED_SLUGS[locale]) take(resources.find((r) => r.slug === slug));

  const pool = resources.filter(
    (r) => !isDailyColumn(r) && (r.lang ?? "zh") === locale && Boolean(r.slug),
  );
  const byId = new Map(pool.map((r) => [r.id, r]));

  for (const { resource_id } of topViewed) take(byId.get(resource_id));

  const byDate = [...pool].sort((a, b) => (contentDate(a) < contentDate(b) ? 1 : -1));
  for (const r of byDate) take(r);

  return picked;
}

/** 每栏目取最新一条:优先当前界面语言,该语言没有时回落任意语言 */
function latestPerColumn(resources: Resource[], locale: Locale) {
  return DAILY_COLUMNS.map((col) => {
    const items = resources.filter((r) => r.subcategory === col.sub);
    const langMatched = items.filter((r) => (r.lang ?? "zh") === locale);
    return { col, item: langMatched[0] ?? items[0] ?? null, total: items.length };
  });
}

export function HomePage() {
  const t = useT();
  const locale = useLocale();
  const lp = (path: string) => localizedPath(path, locale);
  const { data: resources } = useSuspenseQuery(resourcesQO);

  const today = useMemo(() => latestPerColumn(resources, locale), [resources, locale]);

  const { data: topViewed } = useSuspenseQuery(topViewedQO);

  const featured = useMemo(
    () => pickFeatured(resources, topViewed, locale),
    [resources, topViewed, locale],
  );

  const stats = useMemo(() => computeSiteStats(resources), [resources]);

  const lastUpdated = useMemo(() => {
    if (!stats.latestDay) return null;
    const d = new Date(`${stats.latestDay}T12:00:00Z`);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [stats.latestDay, locale]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="flex flex-col">
      {/* 区块 1 · Hero(读者视角主张 + 今日/精选双入口) */}
      <section className="relative overflow-hidden border-b border-border/50 px-4 py-16 sm:py-20">
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
            {t("home.badge")}
            {lastUpdated && (
              <>
                <span className="mx-1 h-3 w-px bg-border" />
                <Clock className="h-3 w-3" />
                <span>{t("home.updatedOn", { d: lastUpdated })}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            {t("home.hero.line1")}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              {t("home.hero.line2")}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t("home.hero.desc")}
          </p>

          {/* 「这站还活着」数据条(2026-08-26):连更天数是回访读者最认的信号 */}
          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              {
                key: "active",
                value: stats.activeDays,
                label: t("home.stats.active"),
                accent: true,
              },
              { key: "total", value: stats.total, label: t("home.stats.total") },
              { key: "longform", value: stats.longform, label: t("home.stats.longform") },
            ].map((s) => (
              <div key={s.key} className="flex items-baseline gap-1.5">
                <dt className="sr-only">{s.label}</dt>
                <dd
                  className={`text-2xl font-bold tabular-nums ${s.accent ? "text-primary" : "text-foreground"}`}
                >
                  {s.value}
                </dd>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={() => scrollTo("today")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
            >
              <CalendarDays className="h-4 w-4" />
              {t("home.cta.today")}
            </button>
            <button
              onClick={() => scrollTo("featured")}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              {t("home.cta.featured")}
            </button>
          </div>
        </div>
      </section>

      {/* 区块 2 · 今日更新条:三栏目各最新一条,只替换不加长(重构方案核心原则) */}
      <section id="today" className="scroll-mt-20 border-b border-border/50 bg-card/40 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("home.today.kicker")}
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.today.title")}
              </h2>
            </div>
            <Link
              to={lp("/daily")}
              className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
            >
              {t("nav.daily")}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {today.map(({ col, item }) => {
              if (!item) return null;
              const href = resourceHref(item);
              const isExternal = href.startsWith("http");
              const inner = (
                <article className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-primary">
                      {t(col.titleKey)} · {fmtShortDate(contentDate(item))}
                    </span>
                    {isNew(contentDate(item)) && (
                      <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                        {t("home.badge.new")}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-base font-semibold text-foreground transition group-hover:text-primary">
                    {item.title || t("home.untitled")}
                  </h3>
                  {/* 简报的标题只有日期,没有摘要就是一张空卡 —— 摘要由管线补齐后显示 */}
                  {item.summary?.trim() && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                    {t("home.read")}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </article>
              );
              return isExternal ? (
                <a key={col.sub} href={href} target="_blank" rel="noreferrer">
                  {inner}
                </a>
              ) : (
                <Link key={col.sub} to={href}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 区块 3 · 招牌精选:人工钉选,不随时间变 */}
      {featured.length > 0 && (
        <section id="featured" className="scroll-mt-20 border-b border-border/50 px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.featured.kicker")}
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.featured.title")}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((r) => {
                const cat = categories.find((c) => c.id === r.category);
                const href = resourceHref(r);
                const isExternal = href.startsWith("http");
                const inner = (
                  <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {cat && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                          {cat ? catLabel(cat, locale) : t("res.uncategorized")}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-lg font-semibold text-foreground transition group-hover:text-primary">
                        {r.title || t("home.untitled")}
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
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary opacity-0 transition group-hover:opacity-100">
                        {t("home.read")}
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

      {/* 区块 4 · 三栏目导览:是什么、更新到哪、进归档 */}
      <section className="border-b border-border/50 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("home.columns.kicker")}
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.columns.title")}
              </h2>
            </div>
            <Link
              to={lp("/daily")}
              className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
            >
              {t("home.viewAll")}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {today.map(({ col, item, total }) => (
              <article
                key={col.sub}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
              >
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{t(col.titleKey)}</h3>
                    <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {t("daily.perDay")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {total} {t("home.count")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t(col.descKey)}</p>
                  {item && (
                    <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
                      <span className="font-medium text-primary/80">
                        {t("home.columns.latest")}:
                      </span>{" "}
                      {item.title}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs font-medium">
                  <a
                    href={locale === "en" && col.archiveEn ? col.archiveEn : col.archive}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1.5 text-primary transition hover:border-primary/50 hover:shadow-sm"
                  >
                    {t("home.columns.archive")}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 区块 5 · 作品带 */}
      <section className="border-b border-border/50 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                <Wrench className="h-3.5 w-3.5" />
                {t("home.works.kicker")}
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.works.title")}
              </h2>
            </div>
            <Link
              to={lp("/tools")}
              className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
            >
              {t("home.works.more")}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((tool) => tool.homeFeatured).map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* 区块 6 · 关于 + 订阅收尾 */}
      <section className="px-4 py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/15 p-8">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                <User className="h-3.5 w-3.5" />
                {t("home.more.about")}
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {t("home.outro.title")}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">{t("home.outro.desc")}</p>
              <Link
                to={lp("/about")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
              >
                {t("home.outro.about")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <SubscribeCard />
        </div>
      </section>
    </div>
  );
}
