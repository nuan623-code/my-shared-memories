import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";
import { Search as SearchIcon, FileText, FolderGit2, X } from "lucide-react";
import {
  projects,
  articles,
  categories,
  type Project,
  type Article,
} from "@/lib/data";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tags: fallback(z.array(z.string()), []).default([]),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  component: SearchPage,
});

function matchText(text: string, q: string) {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

function projectMatches(p: Project, q: string, tags: string[]) {
  const hay = [p.title, p.description, p.content, ...p.tags, ...p.techStack].join(" ");
  const textOk = matchText(hay, q);
  const tagOk = tags.length === 0 || tags.every((t) => p.tags.includes(t));
  return textOk && tagOk;
}

function articleMatches(a: Article, q: string, tags: string[]) {
  const hay = [a.title, a.description, a.content, ...a.tags].join(" ");
  const textOk = matchText(hay, q);
  const tagOk = tags.length === 0 || tags.every((t) => a.tags.includes(t));
  return textOk && tagOk;
}

function SearchPage() {
  const { q, tags } = Route.useSearch();
  const navigate = Route.useNavigate();

  const allTags = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => s.add(t)));
    articles.forEach((a) => a.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, []);

  const matchedProjects = useMemo(
    () => projects.filter((p) => projectMatches(p, q, tags)),
    [q, tags],
  );
  const matchedArticles = useMemo(
    () => articles.filter((a) => articleMatches(a, q, tags)),
    [q, tags],
  );
  const total = matchedProjects.length + matchedArticles.length;

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t: string) => t !== tag) : [...tags, tag];
    navigate({ search: (prev: { q: string; tags: string[] }) => ({ ...prev, tags: next }) });
  };

  const clearAll = () => navigate({ search: { q: "", tags: [] } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">站内搜索</h1>
      <p className="mt-2 text-muted-foreground">在所有项目与文章中搜索关键词，并按标签筛选。</p>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) =>
            navigate({ search: (prev: { q: string; tags: string[] }) => ({ ...prev, q: e.target.value }) })
          }
          placeholder="搜索项目、文章、技术栈..."
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {(q || tags.length > 0) && (
          <button
            onClick={clearAll}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="清空"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          按标签筛选
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={
                  "rounded-full border px-3 py-1 text-xs transition " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
                }
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        {q || tags.length > 0
          ? `共找到 ${total} 个结果`
          : `输入关键词或选择标签开始搜索`}
      </div>

      {matchedProjects.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <FolderGit2 className="h-4 w-4 text-primary" />
            项目 ({matchedProjects.length})
          </h2>
          <ul className="space-y-3">
            {matchedProjects.map((p) => {
              const cat = categories.find((c) => c.id === p.category);
              return (
                <li key={p.id}>
                  <Link
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{ background: cat?.color, color: "oklch(0.25 0.04 260)" }}
                      >
                        {cat?.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.date}</span>
                    </div>
                    <div className="mt-2 font-medium">{p.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {matchedArticles.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-4 w-4 text-primary" />
            文章 ({matchedArticles.length})
          </h2>
          <ul className="space-y-3">
            {matchedArticles.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="text-xs text-muted-foreground">
                  {a.date} · {a.readTime}
                </div>
                <div className="mt-2 font-medium">{a.title}</div>
                <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {a.description}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {a.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(q || tags.length > 0) && total === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          没有匹配的内容，试试更换关键词或减少标签筛选。
        </div>
      )}
    </div>
  );
}
