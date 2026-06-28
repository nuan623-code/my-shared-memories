import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Tag as TagIcon, Layers, BookOpen } from "lucide-react";
import { articles, projects, categories, getCategory, type CategoryId } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mingyu Yang — 个人创作空间" },
      { name: "description", content: "Mingyu Yang 的个人项目记录与分享网站，涵盖游戏开发、AI 学习、课程作业与公众号文章。" },
      { property: "og:title", content: "Mingyu Yang — 个人创作空间" },
      { property: "og:description", content: "Mingyu Yang 的个人项目记录与分享网站" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  // 按大类聚合标签
  const tagsByCategory = categories
    .map((cat) => {
      const items = [
        ...articles.filter((a) => (a.category || "article") === cat.id),
        ...projects.filter((p) => p.category === cat.id),
      ];
      const freq = items
        .flatMap((i) => i.tags)
        .reduce<Record<string, number>>((acc, t) => {
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});
      const tags = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      return { cat, tags };
    })
    .filter((g) => g.tags.length > 0);

  const allTags = [
    ...articles.flatMap((a) => a.tags),
    ...projects.flatMap((p) => p.tags),
  ];
  const topicCount = new Set(allTags).size;
  const totalCount = articles.length + projects.length;

  // 按大类聚合 articles
  const articlesByCategory = articles.reduce<Record<string, typeof articles>>(
    (acc, a) => {
      const key = a.category || "article";
      (acc[key] ||= []).push(a);
      return acc;
    },
    {}
  );

  const stats = [
    { label: "文章 / 笔记", value: articles.length, icon: FileText },
    { label: "项目 / 视频", value: projects.length, icon: Layers },
    { label: "覆盖主题", value: topicCount, icon: TagIcon },
    { label: "内容总数", value: totalCount, icon: BookOpen },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/20" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Mingyu Yang
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            广告技术解决方案负责人，拥有 10 余年移动互联网行业经验，关注 AI、软件开发、数据分析与产品实践。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/articles"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              浏览文章
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

      {/* Stats */}
      <section className="px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4 sm:gap-4 sm:p-6">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tag Cloud */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">主题地图</h2>
            <Link
              to="/search"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              进入搜索
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-6">
            {sortedTags.map(([tag, count]) => {
              // 字号按频率缩放：1 → 0.85rem，最高 → 1.35rem
              const max = sortedTags[0][1];
              const min = 1;
              const ratio = (count - min) / Math.max(max - min, 1);
              const fontSize = 0.85 + ratio * 0.5;
              const opacity = 0.55 + ratio * 0.45;
              return (
                <Link
                  key={tag}
                  to="/search"
                  search={{ q: "", tags: [tag] }}
                  className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                  style={{ fontSize: `${fontSize}rem`, opacity }}
                >
                  {tag}
                  <span className="ml-1 text-xs opacity-70">{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline by Category */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">内容时间线</h2>
            <Link
              to="/articles"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            {/* 竖线 */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent sm:left-4" />

            <div className="space-y-10">
              {categories.map((cat) => {
                const items = articlesByCategory[cat.id] || [];
                if (items.length === 0) return null;
                return (
                  <div key={cat.id} className="relative pl-10 sm:pl-14">
                    {/* 节点 */}
                    <div
                      className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background sm:left-1 sm:h-7 sm:w-7"
                      style={{ backgroundColor: cat.color }}
                    >
                      <div className="h-2 w-2 rounded-full bg-white/90" />
                    </div>

                    <div className="mb-3 flex items-baseline gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{cat.label}</h3>
                      <span className="text-xs text-muted-foreground">{items.length} 篇 · {cat.description}</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((article) => (
                        <Link
                          key={article.id}
                          to="/articles/$slug"
                          params={{ slug: article.id }}
                          className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                        >
                          <h4 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
                            {article.title}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {article.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
