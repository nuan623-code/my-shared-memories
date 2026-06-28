import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { fetchResources, RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resources";
import { ResourceMasonry } from "@/components/ResourceMasonry";
import { categories } from "@/lib/data";

const allResourcesQO = queryOptions({
  queryKey: ["resources", "all"],
  queryFn: () => fetchResources({}),
});

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "资源库 — Mingyu's Library" },
      { name: "description", content: "浏览所有文章、视频、链接、文件与碎片笔记。" },
      { property: "og:title", content: "资源库 — Mingyu's Library" },
      { property: "og:description", content: "浏览所有内容资源" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(allResourcesQO),
  component: ResourcesPage,
  pendingMs: 0,
  pendingComponent: ResourcesPendingPage,
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

function ResourcesPage() {
  const { data: resources } = useSuspenseQuery(allResourcesQO);
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

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-8">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              类型
            </h3>
            <div className="space-y-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                    type === t
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  {t === "all" ? "全部" : RESOURCE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              分类
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
                全部分类
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
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {allTags.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                热门标签
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
          <span className="text-xs text-muted-foreground">{filtered.length} 项</span>
        </div>
        <ResourceMasonry resources={filtered} />
      </div>
    </div>
  );
}
