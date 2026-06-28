import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchResources } from "@/lib/resources";
import { ResourceMasonry } from "@/components/ResourceMasonry";

const notesQO = queryOptions({
  queryKey: ["resources", "notes"],
  queryFn: () => fetchResources({ type: "note" }),
});

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "碎片笔记 — Mingyu's Library" },
      { name: "description", content: "随手记录的想法与灵感闪记。" },
      { property: "og:title", content: "碎片笔记 — Mingyu's Library" },
      { property: "og:description", content: "随手记录的想法与灵感" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQO),
  component: NotesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">出错了：{error.message}</div>
  ),
});

function NotesPage() {
  const { data: notes } = useSuspenseQuery(notesQO);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">碎片笔记</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          随手冒出来的想法、灵感与闪念，共 {notes.length} 条
        </p>
      </header>
      <ResourceMasonry resources={notes} />
    </div>
  );
}
