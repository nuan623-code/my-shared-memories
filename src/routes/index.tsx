import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ArrowRight, Library } from "lucide-react";
import { fetchResources, RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resources";
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

const TYPE_FILTERS: { id: ResourceType | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "article", label: RESOURCE_TYPE_LABELS.article },
  { id: "video", label: RESOURCE_TYPE_LABELS.video },
  { id: "link", label: RESOURCE_TYPE_LABELS.link },
  { id: "file", label: RESOURCE_TYPE_LABELS.file },
  { id: "note", label: RESOURCE_TYPE_LABELS.note },
];

function HomePage() {
  const { data: resources } = useSuspenseQuery(resourcesQO);
  const [filter, setFilter] = useState<ResourceType | "all">("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: resources.length };
    for (const r of resources) c[r.type] = (c[r.type] || 0) + 1;
    return c;
  }, [resources]);

  const filtered = useMemo(
    () => (filter === "all" ? resources : resources.filter((r) => r.type === filter)),
    [resources, filter],
  );

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50 px-4 py-14 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/15" />
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Library className="h-3.5 w-3.5 text-primary" />
            Mingyu's Library — 个人资源库
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            我想记录、分享的<br className="hidden sm:block" />
            <span className="text-primary">任何东西</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            文章笔记、教学视频、好用的工具、值得保存的文件、突然冒出来的想法 ——
            统一放在这里，随时翻阅。
          </p>
        </div>
      </section>

      {/* Type filter chips */}
      <section className="sticky top-[57px] z-30 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md">
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
                    ? "border-primary bg-primary text-primary-foreground"
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
      <section className="px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <ResourceMasonry resources={filtered} />
        </div>
      </section>
    </div>
  );
}
