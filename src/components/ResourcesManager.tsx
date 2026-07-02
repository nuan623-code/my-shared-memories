import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2, Pin, PinOff, ExternalLink } from "lucide-react";
import { RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/resources";

interface ResourceRow {
  id: string;
  slug: string | null;
  title: string | null;
  type: ResourceType;
  category: string | null;
  published_at: string;
  pinned: boolean;
}

const FILTERS: (ResourceType | "all")[] = ["all", "article", "video", "link", "file", "note"];

async function loadResources(type: ResourceType | "all"): Promise<ResourceRow[]> {
  let q = supabase
    .from("resources")
    .select("id, slug, title, type, category, published_at, pinned")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(200);
  if (type !== "all") q = q.eq("type", type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ResourceRow[];
}

export function ResourcesManager() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ResourceType | "all">("all");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-resources", filter],
    queryFn: () => loadResources(filter),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      // RLS 拦截时 Supabase 返回 0 行且不报错,必须核对返回行数,否则会假成功
      const { data, error } = await supabase.from("resources").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("删除未生效:数据库没有放行(需要管理员删除策略)");
    },
    onSuccess: () => {
      toast.success("已删除");
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "删除失败"),
  });

  const togglePin = useMutation({
    mutationFn: async (row: ResourceRow) => {
      const { error } = await supabase.from("resources").update({ pinned: !row.pinned }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
  });

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">资料管理</h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={
              filter === t
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            {t === "all" ? "全部" : RESOURCE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无资料</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-2">标题</th>
                <th className="py-2 px-2 hidden sm:table-cell">类型</th>
                <th className="py-2 px-2 hidden sm:table-cell">分类</th>
                <th className="py-2 px-2 hidden sm:table-cell">发布</th>
                <th className="py-2 pl-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      {r.pinned && <Pin className="h-3 w-3 text-primary" />}
                      <span className="line-clamp-1 text-foreground">{r.title || "(无标题)"}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                    {RESOURCE_TYPE_LABELS[r.type] ?? r.type}
                  </td>
                  <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground">{r.category || "-"}</td>
                  <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                    {new Date(r.published_at).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {r.slug &&
                        (r.type === "article" ? (
                          <Link to="/articles/$slug" params={{ slug: r.slug }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="打开">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link to="/resources/$slug" params={{ slug: r.slug }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="打开">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        ))}
                      <button
                        type="button"
                        onClick={() => togglePin.mutate(r)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title={r.pinned ? "取消置顶" : "置顶"}
                      >
                        {r.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`删除「${r.title || "未命名"}」？`)) del.mutate(r.id);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
