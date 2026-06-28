import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Gamepad2, Brain, FileText, ArrowRight, Calendar, Clock } from "lucide-react";
import { articles, categories } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mingyu Yang — 个人创作空间" },
      { name: "description", content: "Mingyu Yang 的个人项目记录与分享网站，涵盖 Web 开发、游戏开发、AI 学习与公众号文章。" },
      { property: "og:title", content: "Mingyu Yang — 个人创作空间" },
      { property: "og:description", content: "Mingyu Yang 的个人项目记录与分享网站" },
    ],
  }),
  component: HomePage,
});

const categoryIcons: Record<string, typeof Globe> = {
  web: Globe,
  game: Gamepad2,
  ai: Brain,
  homework: FileText,
};

function HomePage() {
  const featuredProjects = projects.slice(0, 4);
  const latestArticles = articles.slice(0, 2);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/20" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Mingyu Yang
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            广告技术解决方案负责人，拥有 10 余年移动互联网行业经验，关注 AI、软件开发、数据分析与产品实践。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              浏览项目
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
            >
              了解更多
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-foreground">
            探索分类
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.id] || Globe;
              return (
                <Link
                  key={cat.id}
                  to="/projects"
                  search={{ category: cat.id }}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:shadow-md hover:-translate-y-1"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: cat.color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">精选项目</h2>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">最新文章</h2>
            <Link
              to="/articles"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {latestArticles.map((article) => (
              <Link
                key={article.id}
                to="/articles"
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {article.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {article.date}
                    </span>
                  )}
                  {article.readTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {article.description}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
