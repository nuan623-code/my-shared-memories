import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { fetchResources, RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resources";
import { ResourceMasonry } from "@/components/ResourceMasonry";
import { categories, catLabel } from "@/lib/data";
import { useT, useLocale } from "@/lib/i18n/use-t";
import { i18nHead } from "@/lib/i18n/head";

export const allResourcesQO = queryOptions({
  queryKey: ["resources", "all"],
  queryFn: () => fetchResources({}),
});

export const Route = createFileRoute("/resources")({
  head: () =>
    i18nHead({
      path: "/resources",
      locale: "zh",
      title: "资源库 — Mingyu's Library",
      description: "浏览所有文章、视频、链接、文件与碎片笔记,可按类型、分类与语言筛选。",
    }),
  component: ResourcesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">出错了：{error.message}</div>
  ),
});

const TYPES: (ResourceType | "all")[] = ["all", "article", "video", "link", "file", "note"];

function ResourcesPendingPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          <div className="h-5 w-20 rounded-md bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 break-inside-avoid rounded-2xl border border-border bg-card p-5"
            >
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

export function ResourcesPage() {
  const t = useT();
  const locale = useLocale();
  const { data: resources = [], isLoading, error, refetch } = useQuery(allResourcesQO);
  const [type, setType] = useState<ResourceType | "all">("all");
  const [cat, setCat] = useState<string>("all");
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resources) for (const t of r.tags) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [resources]);

  const filtered = useMemo(
    () =>
      resources.filter((r) => {
        if (type !== "all" && r.type !== type) return false;
        if (cat !== "all" && r.category !== cat) return false;
        if (tag && !r.tags.includes(tag)) return false;
        return true;
      }),
    [resources, type, cat, tag],
  );

  if (isLoading) return <ResourcesPendingPage />;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">资源库</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("res.error")}</p>
        <button
          onClick={() => refetch()}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("res.filter.type")}
            </h3>
            <div className="space-y-1">
              {TYPES.map((ty) => (
                <button
                  key={ty}
                  onClick={() => setType(ty)}
                  className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                    type === ty
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  {ty === "all" ? t("res.filter.all") : RESOURCE_TYPE_LABELS[ty]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("res.filter.category")}
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setCat("all")}
                className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                  cat === "all"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {t("res.filter.allCategories")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                    cat === c.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {catLabel(c, locale)}
                </button>
              ))}
            </div>
          </div>
          {allTags.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("res.filter.tags")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {allTags.slice(0, 30).map(([t, n]) => (
                  <button
                    key={t}
                    onClick={() => setTag(tag === t ? null : t)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                      tag === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground/70 hover:border-primary/40"
                    }`}
                  >
                    {t} <span className="opacity-60">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            资源库
          </h1>
          <span className="text-xs text-muted-foreground">{filtered.length} {t("res.count")}</span>
        </div>
        <ResourceMasonry resources={filtered} />
      </div>
    </div>
  );
}
