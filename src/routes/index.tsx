import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Library,
  Sparkles,
  Clock,
  Tag,
  Compass,
  Mail,
  Wrench,
} from "lucide-react";
import { fetchResources, isNew, type Resource } from "@/lib/resources";
import { categories, catLabel } from "@/lib/data";
import { SubscribeForm } from "@/components/SubscribeForm";
import { SUIREAD_APP_STORE_URL } from "@/components/SuiReadPromo";
import { useQuery } from "@tanstack/react-query";
import { fetchTopViewed } from "@/lib/views";
import { useT, useLocale } from "@/lib/i18n/use-t";
import { localizedPath } from "@/lib/i18n";
import { i18nHead } from "@/lib/i18n/head";


// 取全量:曾经的 limit:60 会按时间倒序截断,把最老的公众号文章从首页挤掉
// (每日简报每天 +1,挤一篇老文)。Supabase 单请求上限 1000,足够用很久;
// 接近时再做分页。
export const resourcesQO = queryOptions({
  queryKey: ["resources", "home"],
  queryFn: () => fetchResources({}),
});

// 我自己做的小工具。它们是 public/ 下的独立静态页面(projects/、ai-daily/ 等,在 React Router 之外),
// 所以用普通 <a href> 而不是 <Link>。以后新增工具往这个数组里加即可。
// icon / cta / gaEvent 为可选:随读是上架 App(外链 App Store、有自己的图标),
// 其余站内工具不传这三项,表现与原来一致。
const TOOLS: {
  title: string;
  titleEn?: string;
  href: string;
  hrefEn?: string; // 有英文版页面的工具,en 界面下用这个链接
  desc: string;
  descEn?: string;
  tags: string[];
  icon?: string;
  cta?: string;
  gaEvent?: string;
}[] = [
  {
    title: "随读 SuiRead(iOS App)",
    titleEn: "SuiRead (iOS app)",
    href: SUIREAD_APP_STORE_URL,
    desc: "我做的 HTML 阅读器。把本站文章下载成 HTML 导入,就能离线阅读、高亮标注,进度自动记忆。",
    descEn: "An HTML reader I built. Download any article here, import it, and read offline with highlights and saved progress.",
    tags: ["iOS", "阅读器", "App Store"],
    icon: "/suiread-icon.png",
    cta: "App Store",
    gaEvent: "suiread_home_tool_click",
  },
  {
    title: "公众号 Markdown 排版",
    titleEn: "WeChat Markdown formatter",
    href: "/projects/wechat-md/",
    desc: "把 Markdown 一键转成微信公众号可直接粘贴的排版样式，实时预览、多主题，写完即排。",
    descEn: "Turn Markdown into paste-ready WeChat article styling — live preview, multiple themes.",
    tags: ["Markdown", "公众号", "排版"],
  },
  {
    title: "Claude Code 学习站",
    titleEn: "Claude Code learning hub",
    href: "/claude-code/",
    hrefEn: "/en/claude-code/",
    desc: "每日更新:14 课系统课程从零建立体系,实战 Tip 按问题检索、单页自足。基于官方文档增量写成。",
    descEn: "Updated daily: a 14-day systematic course plus searchable, self-contained tips, all grounded in the official docs.",
    tags: ["Claude Code", "教程", "每日更新"],
  },
  {
    title: "AI 每日简报",
    titleEn: "AI daily briefing",
    href: "/ai-briefing/",
    desc: "每天的 AI 技术情报速览：官方发布、Agent 工程、学术与行业动态，列表即当日头条。",
    descEn: "A daily scan of AI news: official releases, agent engineering, research and industry moves.",
    tags: ["AI", "情报", "每日更新"],
  },
  {
    title: "AI 深度学习",
    titleEn: "AI deep dives",
    href: "/ai-daily/",
    desc: "每天自动精选一个 AI 主题生成深度学习文档，按日归档。由 Cowork 定时任务生成、本机自动部署。",
    descEn: "One AI topic each day, written up as a deep-dive document and archived by date.",
    tags: ["AI", "深度学习", "自动化"],
  },
];

export const Route = createFileRoute("/")({
  head: () =>
    i18nHead({
      path: "/",
      locale: "zh",
      title: "Mingyu's Library — 个人资源库",
      description: "Mingyu 的个人资源库:AI 工程深度文档、每日 AI 简报、出海增长笔记与碎片想法。",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      加载资源失败:{error.message}
    </div>
  ),
});

function resourceHref(r: Resource): string {
  if (r.type === "article" && r.slug) return `/articles/${r.slug}`;
  if (r.url) return r.url;
  return "/resources";
}

export function HomePage() {
  const t = useT();
  const locale = useLocale();
  const lp = (path: string) => localizedPath(path, locale);
  const { data: resources } = useSuspenseQuery(resourcesQO);
  // 分类分区(按 lib/data 的 categories 顺序,空分类不显示)。
  // 2026-08-05 整理:每日自动内容(简报/深度/Claude Code,100+ 篇且每天增长)不进首页分区——
  // 它们已有各自的归档页与工具卡入口;分区只展示最新 6 张,全量交给资源库页(?cat= 直达)。
  const HOME_HIDDEN_SUBS = ["briefing", "daily", "claude-code"];
  const HOME_CARDS_PER_SECTION = 6;
  const catSections = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          items: resources.filter(
            (r) => r.category === c.id && !HOME_HIDDEN_SUBS.includes(r.subcategory ?? ""),
          ),
        }))
        .filter((s) => s.items.length > 0),
    [resources],
  );

  const featured = useMemo(() => resources.slice(0, 3), [resources]);
  // 最近更新列表:第 4–10 条(前 3 条已是上方亮点卡),fetch 本身按 published_at 倒序
  const recentList = useMemo(() => resources.slice(3, 10), [resources]);

  const topTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resources) for (const t of r.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [resources]);

  const lastUpdated = useMemo(() => {
    if (!resources.length) return null;
    const d = new Date(resources[0].published_at);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "long", day: "numeric" });
  }, [resources, locale]);


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

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to={lp("/resources")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
            >
              <Compass className="h-4 w-4" />
              {t("home.cta.browse")}
            </Link>
            <Link
              to={lp("/search")}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              {t("home.cta.search")}
            </Link>
            <Link
              to={lp("/about")}
              hash="contact"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40"
            >
              <Mail className="h-4 w-4 text-primary" />
              {t("home.cta.contact")}
            </Link>
          </div>

          {/* Stats strip:按分类统计,点击滚动到对应分区 */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {catSections.map((c) => {
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    document
                      .getElementById(`cat-${c.id}`)
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition group-hover:bg-primary/20">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold leading-none text-foreground">
                      {c.items.length}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{catLabel(c, locale)}</div>
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
                  <Clock className="h-3.5 w-3.5" />
                  {t("home.recent.kicker")}
                </div>
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t("home.recent.title")}</h2>
              </div>
              <Link
                to="/resources"
                className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
              >
                {t("home.viewAll")}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((r, i) => {
                const cat = categories.find((c) => c.id === r.category);
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
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {cat && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                          {cat ? catLabel(cat, locale) : t("res.uncategorized")}
                        </span>
                        {isNew(r.published_at) && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {t("home.badge.new")}
                          </span>
                        )}
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

            {/* 最近更新时间列表:第 4–10 条,日期 + 分类色点 + 标题,7 天内标「新」 */}
            {recentList.length > 0 && (
              <ol className="mt-5 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
                {recentList.map((r) => {
                  const cat = categories.find((c) => c.id === r.category);
                  const href = resourceHref(r);
                  const isExternal = href.startsWith("http");
                  const row = (
                    <span className="flex items-center gap-3 px-4 py-2.5 transition group-hover:bg-muted/40">
                      <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(r.published_at).toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cat?.color ?? "currentColor" }}
                      />
                      <span className="line-clamp-1 flex-1 text-sm text-foreground transition group-hover:text-primary">
                        {r.title || t("home.untitled")}
                      </span>
                      {isNew(r.published_at) && (
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {t("home.badge.new")}
                        </span>
                      )}
                    </span>
                  );
                  return (
                    <li key={r.id} className="group">
                      {isExternal ? (
                        <a href={href} target="_blank" rel="noreferrer">
                          {row}
                        </a>
                      ) : (
                        <Link to={href}>{row}</Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      )}

      {/* 小工具:我自己做的小工具,链接到 public/projects 下的独立应用 */}
      {TOOLS.length > 0 && (
        <section className="border-b border-border/50 px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                <Wrench className="h-3.5 w-3.5" />
                {t("home.tools.kicker")}
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t("home.tools.title")}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <a
                  key={tool.href}
                  href={locale === "en" && tool.hrefEn ? tool.hrefEn : tool.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (tool.gaEvent) {
                      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
                        "event",
                        tool.gaEvent,
                      );
                    }
                  }}
                >
                  <article className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        {tool.icon ? (
                          <img
                            src={tool.icon}
                            alt=""
                            className="h-9 w-9 rounded-xl border border-border/60"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition group-hover:bg-primary/20">
                            <Wrench className="h-4 w-4 text-primary" />
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                          {tool.cta ?? t("home.open")}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground transition group-hover:text-primary">
                        {locale === "en" ? (tool.titleEn ?? tool.title) : tool.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{locale === "en" ? (tool.descEn ?? tool.desc) : tool.desc}</p>
                    </div>
                    {tool.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tool.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top viewed + subscribe */}
      <TopViewedAndSubscribe allResources={resources} />


      {/* 分类分区:按 lib/data 的 categories 顺序上下排(AI 学习在上、公众号文章在下),
          空分类不显示;卡片纯文字、不放封面图 */}
      {catSections.map((s) => {
        // 2026-08-05 整理:原「AI 分区按子分类展开全部卡片」在 180+ 篇后失控,
        // 现统一为:每分区只平铺最新 HOME_CARDS_PER_SECTION 张,其余走「查看全部」进资源库
        const groups = [{ id: "__all", label: "", items: s.items.slice(0, HOME_CARDS_PER_SECTION) }];
        return (
        <section
          key={s.id}
          id={`cat-${s.id}`}
          className="scroll-mt-20 border-b border-border/50 px-4 py-12"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.description}
                </div>
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  {catLabel(s, locale)}
                  <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                    {s.items.length} {t("home.count")}
                  </span>
                </h2>
              </div>
              <Link
                to="/resources"
                search={{ cat: s.id }}
                className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
              >
                {t("home.enterLibrary")}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {groups.map((g) => (
            <div key={g.id} className="mt-2 first:mt-0">
              {g.label && (
                <div className="mb-4 mt-8 flex items-center gap-2 first:mt-0">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <h3 className="text-lg font-semibold text-foreground">{catLabel(g, locale)}</h3>
                  <span className="text-xs text-muted-foreground">{g.items.length} {t("home.count")}</span>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
              )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((r) => {
                const href = resourceHref(r);
                const isExternal = href.startsWith("http");
                const inner = (
                  <article className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {new Date(r.published_at).toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          {isNew(r.published_at) && (
                            <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                              {t("home.badge.new")}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 text-primary opacity-0 transition group-hover:opacity-100">
                          {t("home.read")}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-base font-semibold text-foreground transition group-hover:text-primary">
                        {r.title || t("home.untitled")}
                      </h3>
                      {r.summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                      )}
                    </div>
                    {(r.tags?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
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
            ))}
            {s.items.length > HOME_CARDS_PER_SECTION && (
              <div className="mt-8 text-center">
                <Link
                  to="/resources"
                  search={{ cat: s.id }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-primary transition hover:border-primary/50 hover:shadow-sm"
                >
                  {t("home.viewAll")} {s.items.length} {t("home.count")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>
        );
      })}

      {/* Tag cloud */}
      {topTags.length > 0 && (
        <section className="border-t border-border/50 px-4 py-12">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              <Tag className="h-3.5 w-3.5" />
              {t("home.topicMap")}
            </div>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t("home.explore.title")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              {t("home.explore.desc")}
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
                {t("home.more.title")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t("home.more.desc")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/resources"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40"
              >
                {t("home.more.toLibrary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40"
              >
                {t("home.more.about")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TopViewedAndSubscribe({ allResources }: { allResources: Resource[] }) {
  const t = useT();
  const { data: top = [] } = useQuery({
    queryKey: ["top-viewed", 30],
    queryFn: () => fetchTopViewed(30, 5),
    staleTime: 5 * 60_000,
  });
  const byId = new Map(allResources.map((r) => [r.id, r]));
  const topItems = top.map((v) => ({ ...v, resource: byId.get(v.resource_id) })).filter((x) => x.resource);

  return (
    <section className="border-b border-border/50 px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {t("home.hot.kicker")}
          </div>
          <h2 className="mb-5 text-2xl font-semibold text-foreground sm:text-3xl">{t("home.hot.title")}</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("home.hot.empty")}</p>
          ) : (
            <ol className="space-y-2">
              {topItems.map((tv, i) => {
                const r = tv.resource!;
                const href = resourceHref(r);
                const isExternal = href.startsWith("http");
                return (
                  <li key={tv.resource_id} className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-muted/30">
                    <span className="text-lg font-semibold text-primary/70 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {isExternal ? (
                      <a href={href} target="_blank" rel="noreferrer" className="line-clamp-1 flex-1 text-sm font-medium text-foreground hover:text-primary">
                        {r.title || t("home.untitled")}
                      </a>
                    ) : (
                      <Link to={href} className="line-clamp-1 flex-1 text-sm font-medium text-foreground hover:text-primary">
                        {r.title || t("home.untitled")}
                      </Link>
                    )}
                    <span className="text-xs text-muted-foreground">{tv.views} {t("home.hot.views")}</span>
                  </li>
                );

              })}
            </ol>
          )}
        </div>
        <aside className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Mail className="h-3.5 w-3.5" /> {t("home.sub.kicker")}
          </div>
          <h3 className="text-xl font-semibold text-foreground">{t("home.sub.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.sub.desc")}</p>
          <div className="mt-4">
            <SubscribeForm />
          </div>
        </aside>
      </div>
    </section>
  );
}

