import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2, Pin, PinOff, ExternalLink } from "lucide-react";

interface ArticleRow {
  id: string;
  slug: string | null;
  title: string | null;
  category: string | null;
  published_at: string;
  pinned: boolean;
}

async function loadArticles(): Promise<ArticleRow[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("id, slug, title, category, published_at, pinned")
    .eq("type", "article")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ArticleRow[];
}

export function ArticlesManager() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-articles"], queryFn: loadArticles });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("已删除");
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "删除失败"),
  });

  const togglePin = useMutation({
    mutationFn: async (row: ArticleRow) => {
      const { error } = await supabase.from("resources").update({ pinned: !row.pinned }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">文章管理</h2>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无文章</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-2">标题</th>
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
                  <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground">{r.category || "-"}</td>
                  <td className="py-2 px-2 hidden sm:table-cell text-xs text-muted-foreground">
                    {new Date(r.published_at).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {r.slug && (
                        <Link to="/articles/$slug" params={{ slug: r.slug }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="打开">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
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
