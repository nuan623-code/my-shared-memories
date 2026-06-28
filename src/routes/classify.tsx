import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ClipboardCopy,
  Check,
  Wand2,
} from "lucide-react";

import { categories, getCategory } from "@/lib/data";
import { classifyContent } from "@/lib/classify.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/classify")({
  head: () => ({
    meta: [
      { title: "分类助手 — Mingyu Yang" },
      { name: "description", content: "用 AI 自动为新内容建议大类、小类与标签，人工确认后复制为 JSON。" },
    ],
  }),
  component: ClassifyPage,
});

type MediaType = "project" | "video" | "article";

interface Suggestion {
  category: string;
  subcategory: string;
  tags: string[];
  reason: string;
}

function ClassifyPage() {
  const classify = useServerFn(classifyContent);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("article");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  // 人工可编辑的最终结果
  const [finalCat, setFinalCat] = useState<string>("");
  const [finalSub, setFinalSub] = useState<string>("");
  const [finalTags, setFinalTags] = useState<string[]>([]);

  const [copied, setCopied] = useState(false);

  const runClassify = async () => {
    if (!title.trim() || !content.trim()) {
      setError("请填写标题与正文");
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = (await classify({
        data: { title: title.trim(), content: content.trim(), mediaType },
      })) as Suggestion;
      setSuggestion(result);
      setFinalCat(result.category);
      setFinalSub(result.subcategory);
      setFinalTags(result.tags ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请求失败";
      if (msg.includes("429")) setError("AI 调用过于频繁，请稍后再试");
      else if (msg.includes("402")) setError("AI 额度已用尽，请到工作区充值后再试");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentCat = getCategory(finalCat);
  const subOptions = currentCat?.subcategories ?? [];

  const toggleTag = (t: string) => {
    setFinalTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const buildSnippet = () => {
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "new-item";

    if (mediaType === "article") {
      return JSON.stringify(
        {
          id,
          title,
          description: content.slice(0, 80),
          date: new Date().toISOString().slice(0, 10),
          readTime: `${Math.max(1, Math.round(content.length / 400))} 分钟`,
          category: finalCat,
          subcategory: finalSub,
          tags: finalTags,
          content,
        },
        null,
        2,
      );
    }
    return JSON.stringify(
      {
        id,
        title,
        description: content.slice(0, 80),
        category: finalCat,
        subcategory: finalSub,
        mediaType,
        tags: finalTags,
        date: new Date().toISOString().slice(0, 7),
        image: "",
        techStack: mediaType === "video" ? ["视频"] : [],
        content,
        ...(mediaType === "video" ? { videoEmbedUrl: "", duration: "" } : {}),
      },
      null,
      2,
    );
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(buildSnippet());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("复制失败，请手动选中复制");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <Wand2 className="h-7 w-7 text-primary" />
          分类助手
        </h1>
        <p className="mt-2 text-muted-foreground">
          粘贴新内容，AI 会根据当前网站的 taxonomy 建议大类、小类和标签；你可以人工调整后复制 JSON，交由 Claude 推送到 GitHub。
        </p>
      </div>

      {/* 输入区 */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["article", "project", "video"] as MediaType[]).map((t) => (
            <button
              key={t}
              onClick={() => setMediaType(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                mediaType === t
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "article" ? "文章" : t === "video" ? "视频" : "项目"}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="内容标题"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="粘贴正文 / 视频简介 / 项目说明…"
          rows={8}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.length} 字</span>
          <button
            onClick={runClassify}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "AI 分类中…" : "AI 建议分类"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="text-foreground">{error}</span>
          </div>
        )}
      </div>

      {/* AI 建议 + 人工确认 */}
      {suggestion && (
        <div className="mt-6 space-y-5 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
            <span>
              <span className="font-medium text-foreground">AI 建议：</span>
              {suggestion.reason}
            </span>
          </div>

          {/* 大类编辑 */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">大类</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setFinalCat(c.id);
                    setFinalSub(c.subcategories[0]?.id ?? "");
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition",
                    finalCat === c.id
                      ? "bg-foreground text-background"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 小类编辑 */}
          {subOptions.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">小类</div>
              <div className="flex flex-wrap gap-2">
                {subOptions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFinalSub(s.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition",
                      finalSub === s.id
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 标签编辑 */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">标签</div>
            <div className="flex flex-wrap gap-2">
              {(suggestion.tags ?? []).map((t) => {
                const active = finalTags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground line-through opacity-60",
                    )}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* JSON 输出 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                可粘贴到 src/lib/data.ts 的 JSON
              </div>
              <button
                onClick={copySnippet}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition hover:bg-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                {copied ? "已复制" : "复制 JSON"}
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-background p-4 text-xs leading-relaxed text-foreground">
              {buildSnippet()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
