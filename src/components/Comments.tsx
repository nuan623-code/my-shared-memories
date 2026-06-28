import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Reply, Trash2, Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Profile = { display_name: string; title: string };
type CommentRow = {
  id: string;
  resource_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles: Profile | null;
};
type TreeNode = CommentRow & { children: TreeNode[] };

async function fetchComments(resourceId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, resource_id, user_id, parent_id, content, created_at, profiles(display_name, title)")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommentRow[];
}

function buildTree(rows: CommentRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" });
}

export function Comments({ resourceId }: { resourceId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["comments", resourceId],
    queryFn: () => fetchComments(resourceId),
  });

  const tree = useMemo(() => buildTree(rows ?? []), [rows]);

  const create = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId: string | null }) => {
      if (!user) throw new Error("请先登录");
      const { error } = await supabase.from("comments").insert({
        resource_id: resourceId,
        user_id: user.id,
        parent_id: parentId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", resourceId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", resourceId] }),
  });

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <MessageSquare className="h-4 w-4 text-primary" />
        评论与批注
        <span className="text-xs font-normal text-muted-foreground">({rows?.length ?? 0})</span>
      </h2>

      {user ? (
        <CommentForm
          placeholder="留下你的批注或想法..."
          submitting={create.isPending}
          onSubmit={(content) => create.mutateAsync({ content, parentId: null })}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            登录
          </Link>
          后即可发表评论
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">加载评论中...</div>
        ) : tree.length === 0 ? (
          <div className="text-sm text-muted-foreground">还没有评论，来做第一个吧。</div>
        ) : (
          tree.map((node) => (
            <CommentNode
              key={node.id}
              node={node}
              currentUserId={user?.id}
              depth={0}
              onReply={(content, parentId) => create.mutateAsync({ content, parentId })}
              onDelete={(id) => remove.mutateAsync(id)}
              replying={create.isPending}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CommentNode({
  node,
  currentUserId,
  depth,
  onReply,
  onDelete,
  replying,
}: {
  node: TreeNode;
  currentUserId?: string;
  depth: number;
  onReply: (content: string, parentId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  replying: boolean;
}) {
  const [open, setOpen] = useState(false);
  const name = node.profiles?.display_name ?? "匿名读者";
  const title = node.profiles?.title ?? "读者";
  const isMine = currentUserId === node.user_id;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border/60 pl-4" : ""}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-medium text-primary-foreground">
          {name.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{name}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {title}
            </span>
            <span className="text-xs text-muted-foreground">{formatTime(node.created_at)}</span>
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
            {node.content}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {currentUserId && depth < 3 && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Reply className="h-3 w-3" /> 回复
              </button>
            )}
            {isMine && (
              <button
                onClick={() => onDelete(node.id)}
                className="inline-flex items-center gap-1 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> 删除
              </button>
            )}
          </div>
          {open && (
            <div className="mt-3">
              <CommentForm
                placeholder={`回复 ${name}...`}
                submitting={replying}
                onSubmit={async (content) => {
                  await onReply(content, node.id);
                  setOpen(false);
                }}
              />
            </div>
          )}
          {node.children.length > 0 && (
            <div className="mt-4 space-y-4">
              {node.children.map((child) => (
                <CommentNode
                  key={child.id}
                  node={child}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                  onReply={onReply}
                  onDelete={onDelete}
                  replying={replying}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentForm({
  placeholder,
  submitting,
  onSubmit,
}: {
  placeholder: string;
  submitting: boolean;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        try {
          setErr(null);
          await onSubmit(trimmed);
          setValue("");
        } catch (e: any) {
          setErr(e?.message ?? "提交失败");
        }
      }}
      className="space-y-2"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{value.length}/2000</span>
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-3 w-3" /> {submitting ? "发送中..." : "发表"}
        </button>
      </div>
      {err && <div className="text-xs text-destructive">{err}</div>}
    </form>
  );
}
