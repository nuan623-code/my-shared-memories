import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getArticleById } from "@/lib/data";

export const Route = createFileRoute("/articles/$slug")({
  component: ArticleDetailPage,
  loader: ({ params }) => {
    const article = getArticleById(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.article.title} — Mingyu Yang` },
      { name: "description", content: loaderData.article.description },
    ],
  }),
});

function ArticleDetailPage() {
  const { article } = Route.useLoaderData();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回文章列表
          </Link>
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              在 GitHub Pages 打开
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* iframe 嵌入区域 */}
      <div className="flex-1">
        {article.link ? (
          <iframe
            src={article.link}
            title={article.title}
            className="h-[calc(100vh-7rem)] w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex h-96 items-center justify-center text-muted-foreground">
            暂无外部链接
          </div>
        )}
      </div>
    </div>
  );
}
