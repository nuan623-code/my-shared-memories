import { createFileRoute, Navigate, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fetchResourceBySlug } from "@/lib/resources";

export const Route = createFileRoute("/resources/$slug")({
  loader: async ({ params }) => {
    const r = await fetchResourceBySlug(params.slug);
    if (!r) throw notFound();
    return { r };
  },
  head: ({ loaderData }) => {
    const r = loaderData?.r;
    const title = `${r?.title ?? "资源"} — Mingyu's Library`;
    const desc = r?.summary ?? r?.title ?? "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: ResourceDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">资源不存在</div>
  ),
});

function ResourceDetailPage() {
  const { r } = Route.useLoaderData();

  if (r.type === "article") {
    return <Navigate to="/articles/$slug" params={{ slug: r.slug! }} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/resources" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回资源库
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{r.title}</h1>
      {r.summary && <p className="mt-3 text-base text-muted-foreground">{r.summary}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {r.tags.map((t: string) => (
          <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {t}
          </span>
        ))}
      </div>

      {r.type === "video" && r.url && (
        <div className="mt-6 aspect-video overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            src={r.url}
            title={r.title ?? ""}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {r.type === "file" && r.file_url && (
        <a
          href={r.file_url}
          download
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          下载文件 {r.file_type && `(${r.file_type})`}
        </a>
      )}

      {r.type === "link" && r.url && (
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          访问链接
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {r.content && (
        <div className="prose prose-sm mt-6 max-w-none whitespace-pre-wrap rounded-lg border border-border bg-card p-6">
          {r.content}
        </div>
      )}
    </div>
  );
}
