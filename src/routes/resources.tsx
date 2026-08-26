import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchResources } from "@/lib/resources";
import { ResourceMasonry } from "@/components/ResourceMasonry";
import {
  LIBRARY_SECTIONS,
  dedupeByLocale,
  groupBySection,
  isKnownSection,
  subColor,
  subLabel,
  type SectionFamily,
} from "@/lib/library";
import { useT, useLocale } from "@/lib/i18n/use-t";
import type { Locale } from "@/lib/i18n";
import { i18nHead } from "@/lib/i18n/head";

export const allResourcesQO = queryOptions({
  queryKey: ["resources", "all"],
  queryFn: () => fetchResources({}),
});

/** 分组视图每栏目露几张;8 个栏目 × 3 = 首屏最多 24 张(重构阶段 2 验收线) */
const PREVIEW_PER_SECTION = 3;
/** 单栏目视图每页几张 */
const PAGE_SIZE = 24;

// 老链接 ?cat=<category-id> 仍在外部流通(阶段 1 之前首页各分区的「查看全部」)。
// 新的轴是 ?col=<subcategory>,但 cat 不能失效 —— 这里把它当粗粒度过滤继续认。
const LEGACY_CATS = new Set(["ai", "article", "game", "homework", "video", "tool", "file", "note"]);

export interface ResourcesSearch {
  cat?: string;
  col?: string;
  page?: number;
}

/** /en/resources 是本页的薄封装,共用同一套校验,免得两处漂移 */
export function validateResourcesSearch(s: Record<string, unknown>): ResourcesSearch {
  return {
    cat: typeof s.cat === "string" && LEGACY_CATS.has(s.cat) ? s.cat : undefined,
    col: typeof s.col === "string" && isKnownSection(s.col) ? s.col : undefined,
    page: Number(s.page) > 1 ? Math.floor(Number(s.page)) : undefined,
  };
}

export const Route = createFileRoute("/resources")({
  validateSearch: validateResourcesSearch,
  // SSR 预取:没有 loader 时列表在客户端才渲染,服务端 HTML 正文只有一百多字符,
  // 而 AI 爬虫与部分搜索爬虫不执行 JS —— 等于整个列表对它们不可见。
  loader: ({ context }) => context.queryClient.ensureQueryData(allResourcesQO),
  head: () =>
    i18nHead({
      path: "/resources",
      locale: "zh",
      title: "资源库 — Mingyu's Library",
      description: "按栏目浏览全部文章:手写长文与三个每日栏目(AI 简报、AI 深度学习、Claude Code)。",
    }),
  component: ResourcesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">出错了：{error.message}</div>
  ),
});

function ResourcesPendingPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          <div className="h-5 w-20 rounded-md bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted/70" />
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">资源库</h1>
          <span className="text-xs text-muted-foreground">加载中...</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-4 h-5 w-4/5 rounded bg-muted" />
              <div className="mt-2 h-3 w-full rounded bg-muted/70" />
              <div className="mt-2 h-3 w-2/3 rounded bg-muted/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ sub, count, locale }: { sub: string; count: number; locale: Locale }) {
  const color = subColor(sub);
  return (
    <div className="flex items-center gap-2">
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      <h2 className="text-lg font-semibold text-foreground">{subLabel(sub, locale)}</h2>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

export function ResourcesPage() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  // strict:false 以便 /en/resources 薄封装路由复用本组件时也能读到查询参数
  const search = useSearch({ strict: false }) as ResourcesSearch;
  const { data: resources = [], isLoading, error, refetch } = useQuery(allResourcesQO);

  const visible = useMemo(() => {
    const deduped = dedupeByLocale(resources, locale);
    // 老的 ?cat= 链接仍按大类过滤;新轴是栏目
    return search.cat ? deduped.filter((r) => r.category === search.cat) : deduped;
  }, [resources, locale, search.cat]);

  const grouped = useMemo(() => groupBySection(visible), [visible]);
  const counts = useMemo(
    () => new Map(grouped.map((g) => [g.section.sub, g.items.length])),
    [grouped],
  );

  const activeSection = search.col ?? null;
  const sectionItems = useMemo(
    () => (activeSection ? visible.filter((r) => r.subcategory === activeSection) : []),
    [visible, activeSection],
  );

  const totalPages = Math.max(1, Math.ceil(sectionItems.length / PAGE_SIZE));
  // ?page= 是外部可改的:超界就夹回末页,别渲染一屏空白
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages);
  const pageItems = sectionItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const go = (col?: string, nextPage?: number) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        col,
        page: nextPage && nextPage > 1 ? nextPage : undefined,
      }),
      resetScroll: true,
    });

  if (isLoading) return <ResourcesPendingPage />;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("res.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("res.error")}</p>
        <button
          onClick={() => refetch()}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("res.retry")}
        </button>
      </div>
    );
  }

  const families: SectionFamily[] = ["longform", "daily"];

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
      {/* 侧栏只剩栏目一层(阶段 2:类型与标签两层撤掉,它们与栏目轴交叉出的多是空结果) */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("res.filter.section")}
            </h3>
            <button
              onClick={() => go(undefined)}
              className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                activeSection
                  ? "text-foreground/80 hover:bg-muted"
                  : "bg-primary/10 font-medium text-primary"
              }`}
            >
              {t("res.filter.allSections")}
            </button>
          </div>
          {families.map((family) => {
            const subs = LIBRARY_SECTIONS.filter(
              (s) => s.family === family && (counts.get(s.sub) ?? 0) > 0,
            );
            if (!subs.length) return null;
            return (
              <div key={family}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(family === "longform" ? "res.family.longform" : "res.family.daily")}
                </h3>
                <div className="space-y-1">
                  {subs.map((s) => (
                    <button
                      key={s.sub}
                      onClick={() => go(s.sub)}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                        activeSection === s.sub
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: subColor(s.sub) }}
                      />
                      <span className="min-w-0 flex-1 truncate">{subLabel(s.sub, locale)}</span>
                      <span className="text-xs text-muted-foreground">{counts.get(s.sub)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {activeSection ? subLabel(activeSection, locale) : t("res.title")}
          </h1>
          <span className="shrink-0 text-xs text-muted-foreground">
            {activeSection ? sectionItems.length : visible.length} {t("res.count")}
          </span>
        </div>

        {activeSection ? (
          <>
            <button
              onClick={() => go(undefined)}
              className="mb-4 text-xs text-primary hover:underline"
            >
              {t("res.backToAll")}
            </button>
            <ResourceMasonry resources={pageItems} />
            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3 text-sm">
                <button
                  onClick={() => go(activeSection, page - 1)}
                  disabled={page <= 1}
                  className="rounded-md border border-border px-3 py-1.5 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("res.prev")}
                </button>
                <span className="text-xs text-muted-foreground">
                  {t("res.page", { p: String(page), total: String(totalPages) })}
                </span>
                <button
                  onClick={() => go(activeSection, page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-md border border-border px-3 py-1.5 text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("res.next")}
                </button>
              </nav>
            )}
          </>
        ) : (
          // 默认视图:按栏目分组,每组只露 PREVIEW_PER_SECTION 张。
          // 这样首页高度恒定,新长文不会被 163 条日更压到看不见。
          <div className="space-y-10">
            {grouped.map(({ section, items }) => (
              <section key={section.sub}>
                <div className="mb-3 flex items-end justify-between gap-4">
                  <SectionHeading sub={section.sub} count={items.length} locale={locale} />
                  {items.length > PREVIEW_PER_SECTION && (
                    <button
                      onClick={() => go(section.sub)}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      {t("res.section.viewAll", { n: String(items.length) })}
                    </button>
                  )}
                </div>
                <ResourceMasonry resources={items.slice(0, PREVIEW_PER_SECTION)} />
              </section>
            ))}
            {grouped.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
                {t("res.empty")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
