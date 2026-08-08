import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { resourcesQO } from "./index";
import { resourceHref, isNew, type Resource } from "@/lib/resources";
import { DAILY_COLUMNS } from "@/lib/columns";
import { useT, useLocale } from "@/lib/i18n/use-t";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/daily")({
  head: () =>
    i18nHead({
      path: "/daily",
      locale: "zh",
      title: "每日更新 — Mingyu's Library",
      description: "三条内容线每天自动出刊:AI 简报速览今天,深度解读讲透一个主题,Claude Code 实战课持续连载。",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: DailyPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      加载失败:{error.message}
    </div>
  ),
});

const LIST_PER_COLUMN = 5;

export function DailyPage() {
  const t = useT();
  const locale = useLocale();
  const { data: resources } = useSuspenseQuery(resourcesQO);

  // 每栏目取最新 N 条:优先当前界面语言的行,该语言没有内容时回落全量(如 briefing 暂无英文版)
  const columns = useMemo(
    () =>
      DAILY_COLUMNS.map((col) => {
        const all = resources.filter((r) => r.subcategory === col.sub);
        const langMatched = all.filter((r) => (r.lang ?? "zh") === locale);
        const items = (langMatched.length > 0 ? langMatched : all).slice(0, LIST_PER_COLUMN);
        return { ...col, items };
      }),
    [resources, locale],
  );

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {t("home.columns.kicker")}
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t("daily.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("daily.desc")}</p>
        </div>

        <div className="flex flex-col gap-8">
          {columns.map((col) => (
            <section key={col.sub} className="rounded-2xl border border-border/70 bg-card p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{t(col.titleKey)}</h2>
                    <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {t("daily.perDay")}
                    </span>
                  </div>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t(col.descKey)}</p>
                </div>
                <a
                  href={locale === "en" && col.archiveEn ? col.archiveEn : col.archive}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary/50 hover:shadow-sm"
                >
                  {t("home.columns.archive")}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>

              {col.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("res.empty")}</p>
              ) : (
                <ol className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                  {col.items.map((r) => (
                    <DailyRow key={r.id} r={r} />
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyRow({ r }: { r: Resource }) {
  const t = useT();
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
      <span className="line-clamp-1 flex-1 text-sm text-foreground transition group-hover:text-primary">
        {r.title || t("home.untitled")}
      </span>
      {isNew(r.published_at) && (
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {t("home.badge.new")}
        </span>
      )}
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
    </span>
  );
  return (
    <li className="group">
      {isExternal ? (
        <a href={href} target="_blank" rel="noreferrer">
          {row}
        </a>
      ) : (
        <Link to={href}>{row}</Link>
      )}
    </li>
  );
}
