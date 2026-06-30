import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Comments } from "@/components/Comments";
import { UserAvatar } from "@/components/UserAvatar";
import { deleteNotePost, type NotePost } from "@/lib/notes";

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "刚刚";
  if (d < 3600) return `${Math.floor(d / 60)} 分钟前`;
  if (d < 86400) return `${Math.floor(d / 3600)} 小时前`;
  if (d < 30 * 86400) return `${Math.floor(d / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function NotePostCard({ post }: { post: NotePost }) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);

  const canDelete = !!user && (user.id === post.owner_id || isAdmin);
  const del = useMutation({
    mutationFn: () => deleteNotePost(post.id),
    onSuccess: () => {
      toast.success("已删除");
      qc.invalidateQueries({ queryKey: ["note-posts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "删除失败"),
  });

  const author = post.author?.display_name ?? "匿名读者";
  const authorTitle = post.author?.title ?? "读者";

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar preset={post.author?.avatar_preset} name={author} size="md" />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {author}
              {isAdmin && user?.id === post.owner_id && (
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label="管理员" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {authorTitle} · {timeAgo(post.published_at)}
            </div>
          </div>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm("确定删除这条帖子？")) del.mutate();
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      {post.title && (
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
          {post.title}
        </h2>
      )}

      {post.content && (
        <div className="prose prose-sm mt-2 max-w-none text-foreground prose-headings:font-semibold prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      )}

      {post.cover_url && (
        <img
          src={post.cover_url}
          alt=""
          className="mt-3 max-h-96 w-full rounded-lg border border-border object-cover"
          loading="lazy"
        />
      )}

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-accent/40 px-2 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {showComments ? "收起评论" : `评论 ${post.comment_count ?? 0}`}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span>收藏 {post.favorite_count ?? 0}</span>
          <FavoriteButton resourceId={post.id} stopPropagation={false} />
        </div>
      </footer>

      {showComments && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <Comments resourceId={post.id} title="" compact />
        </div>
      )}
    </article>
  );
}
