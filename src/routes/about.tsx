import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Mail, Github, Linkedin, Rss, ArrowUpRight, Wrench, PenLine } from "lucide-react";
import { i18nHead } from "@/lib/i18n/head";
import { resourcesQO } from "./index";
import { contentDate, isDailyColumn } from "@/lib/resources";
import { computeSiteStats } from "@/lib/site-stats";
import { DAILY_COLUMNS } from "@/lib/columns";
import { TOOLS } from "@/lib/tools";
import { SubscribeCard } from "@/components/SubscribeCard";
import { useT, useLocale } from "@/lib/i18n/use-t";
import { localizedPath } from "@/lib/i18n";

// 关于页(2026-08-26 重构阶段 4)。三段结构:我是谁 / 我在产出什么 / 怎么找我。
// 「在产出什么」刻意用实时数据而不是写死的兴趣清单 —— 原来那版列了五个兴趣方向,
// 一年不动,读者看不出这站还活着,而这正是整轮重构要解决的问题。
export const Route = createFileRoute("/about")({
  head: () =>
    i18nHead({
      path: "/about",
      locale: "zh",
      title: "关于 — Mingyu Yang",
      description: "我是谁、我每天在产出什么、怎么找到我。",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: AboutPage,
});

const LINKS = [
  { href: "mailto:nuan623@gmail.com", icon: Mail, label: "Email" },
  { href: "https://github.com/nuan623-code", icon: Github, label: "GitHub", external: true },
  {
    href: "https://www.linkedin.com/in/mingyu-yang-7048389b/",
    icon: Linkedin,
    label: "LinkedIn",
    external: true,
  },
  { href: "/rss.xml", icon: Rss, label: "RSS" },
];

export function AboutPage() {
  const t = useT();
  const locale = useLocale();
  const lp = (p: string) => localizedPath(p, locale);
  const { data: resources } = useSuspenseQuery(resourcesQO);

  const stats = useMemo(() => computeSiteStats(resources), [resources]);

  /** 每个每日栏目的条数与最新一条日期 —— 关于页要让人一眼看出产出节奏 */
  const columns = useMemo(
    () =>
      DAILY_COLUMNS.map((col) => {
        const items = resources.filter((r) => r.subcategory === col.sub);
        return {
          col,
          count: items.length,
          latest: items.length ? contentDate(items[0]).slice(0, 10) : null,
        };
      }),
    [resources],
  );

  const longform = useMemo(() => resources.filter((r) => !isDailyColumn(r)).length, [resources]);

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
            <span className="text-2xl font-bold text-primary">MY</span>
          </div>
          <h1 className="text-center text-3xl font-bold text-foreground">Mingyu Yang</h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>
              <b className="text-base font-bold tabular-nums text-primary">{stats.activeDays}</b>{" "}
              {t("about.stat.active")}
            </span>
            <span>
              <b className="text-base font-bold tabular-nums text-foreground">{stats.total}</b>{" "}
              {t("about.stat.pieces")}
            </span>
            {stats.latestDay && (
              <span>
                {t("about.stat.since")} {stats.latestDay}
              </span>
            )}
          </div>
        </div>

        {/* 一 · 我是谁 */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-3 text-xl font-semibold text-foreground">{t("about.who.title")}</h2>
          <p className="leading-relaxed text-muted-foreground">{t("about.who.body")}</p>
        </section>

        {/* 二 · 我在产出什么(实时) */}
        <section className="mb-8">
          <h2 className="mb-1 text-xl font-semibold text-foreground">{t("about.making.title")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("about.making.desc")}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            {columns.map(({ col, count, latest }) => (
              <a
                key={col.sub}
                href={locale === "en" ? (col.archiveEn ?? col.archive) : col.archive}
                className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-foreground group-hover:text-primary">
                    {t(col.titleKey)}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {t(col.descKey)}
                </p>
                {latest && (
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-primary">
                    {latest}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
              </a>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              to={lp("/resources")}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
            >
              <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="font-medium text-foreground group-hover:text-primary">
                  {t("about.making.longform")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{longform}</span>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("about.making.longformDesc")}
                </p>
              </div>
            </Link>
            <Link
              to={lp("/tools")}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
            >
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="font-medium text-foreground group-hover:text-primary">
                  {t("about.making.tools")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{TOOLS.length}</span>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("about.making.toolsDesc")}</p>
              </div>
            </Link>
          </div>
        </section>

        {/* 三 · 怎么找我 */}
        <section id="contact" className="mb-8 rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-2 text-xl font-semibold text-foreground">{t("about.reach.title")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{t("about.reach.desc")}</p>
          <div className="flex flex-wrap gap-3">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </a>
            ))}
          </div>
        </section>

        <SubscribeCard variant="inline" />
      </div>
    </div>
  );
}
