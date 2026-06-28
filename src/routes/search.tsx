import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, FileText, FolderGit2, X, Loader2, AlertCircle } from "lucide-react";
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

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-accent/60 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const DEBOUNCE_MS = 300;
const SEARCH_LATENCY_MS = 250;

function SearchPage() {
  const { q, tags } = Route.useSearch();
  const navigate = Route.useNavigate();

  const allTags = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => s.add(t)));
    articles.forEach((a) => a.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, []);

  // 本地输入值（用于防抖）
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当 URL q 由外部变化（如点击建议）时，同步到输入框
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const onInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ search: (prev: { q: string; tags: string[] }) => ({ ...prev, q: value }) });
    }, DEBOUNCE_MS);
  };

  // 搜索请求状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ projects: Project[]; articles: Article[] }>({
    projects: [],
    articles: [],
  });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        const ps = projects.filter((p) => projectMatches(p, q, tags));
        const as = articles.filter((a) => articleMatches(a, q, tags));
        setResults({ projects: ps, articles: as });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜索失败，请重试");
        setLoading(false);
      }
    }, SEARCH_LATENCY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, tags, retryToken]);

  const matchedProjects = results.projects;
  const matchedArticles = results.articles;
  const total = matchedProjects.length + matchedArticles.length;
  const isPendingDebounce = inputValue !== q;
  const showLoading = loading || isPendingDebounce;

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t: string) => t !== tag) : [...tags, tag];
    navigate({ search: (prev: { q: string; tags: string[] }) => ({ ...prev, tags: next }) });
  };

  const clearAll = () => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ search: { q: "", tags: [] } });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">站内搜索</h1>
      <p className="mt-2 text-muted-foreground">在所有项目与文章中搜索关键词，并按标签筛选。</p>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="搜索项目、文章、技术栈..."
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {showLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="加载中" />
        )}
        {(inputValue || tags.length > 0) && !showLoading && (
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
                    <div className="mt-2 font-medium">
                      <Highlight text={p.title} q={q} />
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      <Highlight text={p.description} q={q} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          #<Highlight text={t} q={q} />
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
                <div className="mt-2 font-medium">
                  <Highlight text={a.title} q={q} />
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  <Highlight text={a.description} q={q} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {a.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      #<Highlight text={t} q={q} />
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(q || tags.length > 0) && total === 0 && (
        <NoResults
          q={q}
          tags={tags}
          allTags={allTags}
          onSearch={(nextQ: string, nextTags: string[]) =>
            navigate({ search: { q: nextQ, tags: nextTags } })
          }
          onClearTags={() =>
            navigate({ search: (prev: { q: string; tags: string[] }) => ({ ...prev, tags: [] }) })
          }
        />
      )}
    </div>
  );
}

function NoResults({
  q,
  tags,
  allTags,
  onSearch,
  onClearTags,
}: {
  q: string;
  tags: string[];
  allTags: string[];
  onSearch: (q: string, tags: string[]) => void;
  onClearTags: () => void;
}) {
  const ql = q.toLowerCase().trim();

  const suggestedTags = useMemo(() => {
    if (!ql) return allTags.filter((t) => !tags.includes(t)).slice(0, 8);
    return allTags
      .filter((t) => !tags.includes(t))
      .filter((t) => {
        const tl = t.toLowerCase();
        if (tl.includes(ql) || ql.includes(tl)) return true;
        // 共享前缀（适合中英文部分匹配）
        const n = Math.min(2, ql.length, tl.length);
        return n > 0 && tl.slice(0, n) === ql.slice(0, n);
      })
      .slice(0, 8);
  }, [ql, tags, allTags]);

  const suggestedKeywords = useMemo(() => {
    if (!ql) return [];
    const pool = new Set<string>();
    [...projects, ...articles].forEach((item) => {
      const text = `${item.title} ${item.description}`;
      text
        .split(/[\s,，。、/|·\-—()（）]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && w.length <= 12)
        .forEach((w) => {
          const wl = w.toLowerCase();
          if (wl === ql) return;
          if (wl.includes(ql) || ql.includes(wl)) pool.add(w);
        });
    });
    return Array.from(pool).slice(0, 8);
  }, [ql]);

  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-8">
      <div className="text-center">
        <div className="font-display text-lg font-semibold text-foreground">没有匹配的内容</div>
        <p className="mt-1 text-sm text-muted-foreground">
          试试下方的相近关键词或推荐标签，一键重新搜索。
        </p>
      </div>

      {suggestedKeywords.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            相近关键词
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedKeywords.map((k) => (
              <button
                key={k}
                onClick={() => onSearch(k, [])}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {suggestedTags.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            推荐标签
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((t) => (
              <button
                key={t}
                onClick={() => onSearch("", [t])}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                title={`仅用标签 #${t} 搜索`}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={onClearTags}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition hover:border-primary/40"
          >
            清除当前标签筛选（{tags.length}）
          </button>
        </div>
      )}
    </div>
  );
}
