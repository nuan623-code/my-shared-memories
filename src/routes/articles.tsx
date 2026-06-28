import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, ArrowRight, Newspaper } from "lucide-react";
import { articles } from "@/lib/data";

export const Route = createFileRoute("/articles")({
  head: () => ({
    meta: [
      { title: "文章 — Mingyu Yang" },
      { name: "description", content: "Mingyu Yang 的公众号文章与技术分享。" },
      { property: "og:title", content: "文章 — Mingyu Yang" },
      { property: "og:description", content: "Mingyu Yang 的公众号文章与技术分享" },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground">文章</h1>
          <p className="mt-2 text-muted-foreground">
            记录行业观察、学习心得与技术思考
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {articles.map((article) => (
            <div
              key={article.id}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {article.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.readTime} 阅读
                </span>
              </div>

              <h2 className="text-xl font-semibold text-foreground">
                {article.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {article.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                <Newspaper className="h-4 w-4" />
                公众号文章
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
