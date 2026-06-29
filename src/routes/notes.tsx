import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchNotePosts } from "@/lib/notes";
import { NoteComposer } from "@/components/NoteComposer";
import { NotePostCard } from "@/components/NotePostCard";

const notesQO = queryOptions({
  queryKey: ["note-posts"],
  queryFn: () => fetchNotePosts(),
});

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "碎片广场 — Mingyu's Library" },
      { name: "description", content: "公开的想法广场：任何人都可以发帖、评论、回复。" },
      { property: "og:title", content: "碎片广场 — Mingyu's Library" },
      { property: "og:description", content: "公开的想法广场：任何人都可以发帖、评论、回复。" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQO),
  component: NotesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">出错了：{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center text-sm">未找到</div>,
});

function NotesPage() {
  const { data: posts } = useSuspenseQuery(notesQO);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [posts]);

  const filtered = useMemo(
    () => (activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts),
    [posts, activeTag],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">碎片广场</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          公开的想法广场：任何登录用户都可以发帖、评论、回复，共 {posts.length} 条
        </p>
      </header>

      <NoteComposer />

      {allTags.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              activeTag === null
                ? "bg-primary text-primary-foreground"
                : "bg-accent/40 text-muted-foreground hover:bg-accent"
            }`}
          >
            全部
          </button>
          {allTags.map(([t, c]) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                activeTag === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/40 text-muted-foreground hover:bg-accent"
              }`}
            >
              #{t} <span className="opacity-60">{c}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            {activeTag ? `没有标签为 #${activeTag} 的帖子` : "还没有帖子，来发布第一条吧"}
          </div>
        ) : (
          filtered.map((p) => <NotePostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
