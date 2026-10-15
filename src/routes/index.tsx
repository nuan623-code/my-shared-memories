import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, ArrowUpRight, Library, Clock, CalendarDays, Wrench, User } from "lucide-react";
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
import { dedupeByLocale, groupBySection, subColor, subLabel } from "@/lib/library";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ContentRow } from "@/components/ContentRow";
import { SubscribeCard } from "@/components/SubscribeCard";
import { ToolCard } from "@/components/ToolCard";
import { TOOLS } from "@/lib/tools";
import { DAILY_COLUMNS } from "@/lib/columns";
import { useT, useLocale } from "@/lib/i18n/use-t";
import { localizedPath, type Locale } from "@/lib/i18n";
import { i18nHead } from "@/lib/i18n/head";
import { websiteJsonLd } from "@/lib/jsonld";

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
/** 头图轮播放几张 */
const CAROUSEL_COUNT = 5;
/**
 * 每日栏目里允许上轮播的两条线。
 * 简报不在其中:它的标题只有一个日期,占满一屏大卡等于什么都没说。
 */
const CAROUSEL_DAILY_SUBS = new Set(["daily", "claude-code"]);
/** 轮播里留给每日栏目的席位上限 */
const CAROUSEL_DAILY_QUOTA = 2;
/** 每条卡片带最多放几张。再多就只是让 HTML 变大,没人横滚到第 15 张以后 */
const ROW_LIMIT = 14;
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
      jsonLd: [
        websiteJsonLd(
          "zh",
          "AI 简报、深度解读、Claude Code 实战课,三条内容线每日更新;外加手写长文与开发工具。",
        ),
      ],
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
 * 轮播选片:钉选 → 每日栏目配额 → 30 天热读 → 最新长文,按序补满 CAROUSEL_COUNT。
 *
 * 原来这里只从手写长文里挑,理由是「每日栏目有自己的今日更新条与栏目导览」。
 * 栏目导览在 2026-10-15 的改版里已经去掉,深度学习与小课便只剩今日更新那一张卡,
 * 所以给它们开了配额 —— 但不是直接并池:日更每天产出,一周就能把 70 篇手写长文
 * 全挤出轮播,精选会退化成「最近五天」。
 */
function pickFeatured(
  resources: Resource[],
  topViewed: Array<{ resource_id: string }>,
  locale: Locale,
): Resource[] {
  const picked: Resource[] = [];
  const seen = new Set<string>();
  const take = (r: Resource | undefined | null) => {
    if (!r || seen.has(r.id) || picked.length >= CAROUSEL_COUNT) return;
    seen.add(r.id);
    picked.push(r);
  };

  for (const slug of PINNED_SLUGS[locale]) take(resources.find((r) => r.slug === slug));

  // 每日栏目的配额,取各线最新的几篇。
  // 要求必须有摘要:管线入库时不写 summary(靠 scripts/backfill-summaries.mjs 事后补),
  // 当天新入库那条在补摘要之前是没有的 —— 放进一屏大卡,下半张就是空的。
  const dailyPool = resources
    .filter(
      (r) =>
        CAROUSEL_DAILY_SUBS.has(r.subcategory ?? "") &&
        (r.lang ?? "zh") === locale &&
        Boolean(r.slug) &&
        Boolean(r.summary?.trim()),
    )
    .sort((a, b) => (contentDate(a) < contentDate(b) ? 1 : -1));
  for (const r of dailyPool.slice(0, CAROUSEL_DAILY_QUOTA)) take(r);

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

/** 每条卡片带的数据:按栏目分组、同内容中英去重、每行截断 */
function buildRows(resources: Resource[], locale: Locale) {
  return groupBySection(dedupeByLocale(resources, locale)).map(({ section, items }) => ({
    section,
    items: items.slice(0, ROW_LIMIT),
    total: items.length,
  }));
}

export function HomePage() {
  const t = useT();
  const locale = useLocale();
  const lp = (path: string) => localizedPath(path, locale);
  const { data: resources } = useSuspenseQuery(resourcesQO);
  const { data: topViewed } = useSuspenseQuery(topViewedQO);

  const today = useMemo(() => latestPerColumn(resources, locale), [resources, locale]);

  const featured = useMemo(
    () => pickFeatured(resources, topViewed, locale),
    [resources, topViewed, locale],
  );

  const rows = useMemo(() => buildRows(resources, locale), [resources, locale]);

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

  // 每日栏目的归档是 public/ 下的静态站,用 <a> 直链;手写长文进资源库的对应栏目
  const archiveOf = (sub: string) => {
    const col = DAILY_COLUMNS.find((c) => c.sub === sub);
    if (!col) return undefined;
    return locale === "en" && col.archiveEn ? col.archiveEn : col.archive;
  };

  return (
    <div className="flex flex-col">
      {/* 区块 1 · 身份带(主张 + 这站还活着的数据 + 两个入口)
          纵向留白比改版前收了一截:原来 py-16/20 在手机上要占满一屏,
          第一条内容得滑一屏才见得到,而这轮改版的全部意义就是让内容早点露面。 */}
      <section className="relative overflow-hidden border-b border-border/50 px-4 py-10 sm:py-14">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/20" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
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
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {t("home.hero.line1")}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              {t("home.hero.line2")}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t("home.hero.desc")}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <dl className="flex flex-wrap items-center gap-x-6 gap-y-3">
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => scrollTo("today")}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
              >
                <CalendarDays className="h-4 w-4" />
                {t("home.cta.today")}
              </button>
              <button
                onClick={() => scrollTo("library")}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40"
              >
                <Library className="h-4 w-4 text-primary" />
                {t("home.cta.browseAll")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 区块 2 · 头图轮播:精选长文轮流占一屏宽,替代改版前那个六宫格 */}
      <HeroCarousel items={featured} />

      {/* 区块 3 · 今日更新:三栏目各最新一条,只替换不加长 */}
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

      {/* 区块 4 · 按栏目的横向卡片带。
          改版前这里是「栏目导览」:三张只写着栏目简介和条数的卡,一条内容都不露。
          现在同样是按栏目组织,但每行直接摆十几篇真内容,首页露出量从 12 条上到百条量级。 */}
      <div id="library" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 pt-10">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Library className="h-3.5 w-3.5" />
            {t("home.library.kicker")}
          </div>
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {t("home.library.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("home.library.desc")}</p>
        </div>

        {rows.map(({ section, items, total }) => {
          const archive = archiveOf(section.sub);
          return (
            <ContentRow
              key={section.sub}
              title={subLabel(section.sub, locale)}
              color={subColor(section.sub)}
              kicker={section.family === "daily" ? t("home.library.dailyKicker") : undefined}
              items={items}
              // 每日栏目的全量在静态归档站,长文的全量在资源库对应栏目
              moreHref={archive}
              moreTo={archive ? undefined : lp("/resources")}
              moreSearch={archive ? undefined : { col: section.sub }}
              moreLabel={
                archive ? t("home.columns.archive") : t("home.row.all", { n: String(total) })
              }
            />
          );
        })}

        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link
            to={lp("/resources")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            {t("home.enterLibrary")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 区块 5 · 作品带 */}
      <section className="border-b border-t border-border/50 px-4 py-12">
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
