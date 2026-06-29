import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Film,
  Link2,
  FileDown,
  StickyNote,
  Upload,
  Loader2,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/lib/data";
import type { ResourceType } from "@/lib/resources";
import { importWechatArticle } from "@/lib/wechat-import.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "发布资源 — Mingyu's Library" }] }),
  component: AdminPage,
});

const TYPE_OPTIONS: { id: ResourceType; label: string; Icon: typeof FileText }[] = [
  { id: "note", label: "碎片笔记", Icon: StickyNote },
  { id: "link", label: "外链", Icon: Link2 },
  { id: "file", label: "文件", Icon: FileDown },
  { id: "video", label: "视频", Icon: Film },
  { id: "article", label: "文章", Icon: FileText },
];

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `r-${Date.now()}`
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [type, setType] = useState<ResourceType>("note");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [tagsStr, setTagsStr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("未登录");

      let file_url: string | null = null;
      let file_size: number | null = null;
      let file_type: string | null = null;
      if (type === "file") {
        if (!file) throw new Error("请先选择文件");
        const path = `${uid}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("resources").upload(path, file);
        if (up.error) throw up.error;
        const pub = supabase.storage.from("resources").getPublicUrl(path);
        file_url = pub.data.publicUrl;
        file_size = file.size;
        file_type = file.name.split(".").pop()?.toUpperCase() ?? null;
      }

      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const effectiveTitle =
        type === "note"
          ? title || (content.slice(0, 30) + (content.length > 30 ? "..." : ""))
          : title;

      const slug = type === "note" ? null : slugify(effectiveTitle || `r-${Date.now()}`);

      const payload = {
        type,
        title: effectiveTitle || null,
        summary: summary || null,
        content: content || null,
        url: url || null,
        file_url,
        file_size,
        file_type,
        category: category || null,
        subcategory: subcategory || null,
        tags,
        duration: duration || null,
        slug,
        owner_id: uid,
      };

      const { error } = await supabase.from("resources").insert(payload);
      if (error) throw error;
      toast.success("发布成功");
      qc.invalidateQueries({ queryKey: ["resources"] });
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setBusy(false);
    }
  };

  const catDef = categories.find((c) => c.id === category);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">发布资源</h1>

      <WechatImporter />

      {/* Type picker */}
      <div className="mb-6 grid grid-cols-5 gap-2">
        {TYPE_OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setType(id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition ${
              type === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground/70 hover:border-primary/40"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {type === "note" ? (
          <Field label="想法 / 内容">
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="此刻在想什么..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </Field>
        ) : (
          <>
            <Field label="标题">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            <Field label="摘要">
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            {(type === "link" || type === "video" || type === "article") && (
              <Field label={type === "article" ? "文章 HTML 路径（如 /xxx.html）" : "链接 URL"}>
                <input
                  type={type === "link" ? "url" : "text"}
                  required={type !== "article"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    type === "video"
                      ? "https://..."
                      : type === "link"
                        ? "https://example.com"
                        : "/articles/my-article.html"
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </Field>
            )}

            {type === "video" && (
              <Field label="时长（如 12:30）">
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </Field>
            )}

            {type === "file" && (
              <Field label="文件">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground hover:border-primary/40">
                  <Upload className="h-4 w-4" />
                  {file ? file.name : "点击选择文件"}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Field>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="分类">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">未分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          {catDef && catDef.subcategories.length > 0 && (
            <Field label="子类">
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">无</option>
                {catDef.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="标签（逗号分隔）">
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="例如：AI, 大模型, 笔记"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          发布
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
