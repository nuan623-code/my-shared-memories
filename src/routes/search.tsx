import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search as SearchIcon } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { fetchResources, type Resource, RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resources";
import { ResourceCard } from "@/components/ResourceCard";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  type: fallback(z.enum(["all", "article", "video", "link", "file", "note"]), "all").default("all"),
});

const qo = queryOptions({
  queryKey: ["resources", "all-search"],
  queryFn: () => fetchResources({}),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: () => ({ meta: [{ title: "搜索 — Mingyu's Library" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: all } = useSuspenseQuery(qo);
  const [q, setQ] = useState(params.q);

  const results = useMemo(() => {
    const needle = params.q.trim().toLowerCase();
    return all.filter((r: Resource) => {
      if (params.type !== "all" && r.type !== params.type) return false;
      if (!needle) return true;
      const hay = [r.title, r.summary, r.content, ...r.tags].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [all, params]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (p) => ({ ...p, q }) });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">搜索</h1>
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索资源..."
            className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          搜索
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "article", "video", "link", "file", "note"] as const).map((t) => (
          <Link
            key={t}
            to="/search"
            search={(p) => ({ ...p, type: t })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              params.type === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            {t === "all" ? "全部" : RESOURCE_TYPE_LABELS[t as ResourceType]}
          </Link>
        ))}
      </div>

      <div className="mb-4 text-xs text-muted-foreground">{results.length} 条结果</div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {results.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </div>
  );
}
