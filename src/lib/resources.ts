import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "article" | "video" | "link" | "file" | "note";

export interface Resource {
  id: string;
  slug: string | null;
  type: ResourceType;
  title: string | null;
  summary: string | null;
  content: string | null;
  url: string | null;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  cover_url: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  duration: string | null;
  owner_id: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  /** 内容语言:zh | en(见 supabase/patches/2026-07-28-i18n-lang.sql) */
  lang: string | null;
  /** 同一内容的不同语言版本共享此 key,用于 hreflang 互指与语言切换;单语内容为 null */
  i18n_key: string | null;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  article: "文章",
  video: "视频",
  link: "链接",
  file: "文件",
  note: "笔记",
};

export async function fetchResources(opts?: {
  type?: ResourceType;
  limit?: number;
}): Promise<Resource[]> {
  let q = supabase.from("resources").select("*").order("published_at", { ascending: false });
  if (opts?.type) q = q.eq("type", opts.type);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Resource[];
}

export async function fetchResourceBySlug(slug: string): Promise<Resource | null> {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as Resource | null;
}

/** 资源的站内跳转地址:站内文章走阅读器外壳,其余用自身 url(2026-08-08 从首页抽出共享) */
export function resourceHref(r: Resource): string {
  if (r.type === "article" && r.slug) return `/articles/${r.slug}`;
  if (r.url) return r.url;
  return "/resources";
}

/** 中文完整日期,如 2026年7月6日 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 发布/更新时间在 N 天内视为「新」(默认 7 天),用于新徽标 */
export function isNew(iso: string | null | undefined, days = 7): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < days * 86_400_000;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const u = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function hostnameOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const NOTE_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.94 0.04 240) 0%, oklch(0.92 0.06 220) 100%)",
  "linear-gradient(135deg, oklch(0.93 0.05 270) 0%, oklch(0.91 0.07 250) 100%)",
  "linear-gradient(135deg, oklch(0.94 0.04 200) 0%, oklch(0.92 0.06 180) 100%)",
  "linear-gradient(135deg, oklch(0.94 0.04 280) 0%, oklch(0.92 0.06 260) 100%)",
  "linear-gradient(135deg, oklch(0.93 0.05 220) 0%, oklch(0.91 0.07 200) 100%)",
];

export function noteGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return NOTE_GRADIENTS[h % NOTE_GRADIENTS.length];
}

/** 查同一内容的其他语言版本(i18n_key 相同),用于 hreflang 互指与语言切换 */
export async function fetchTranslations(
  i18nKey: string | null,
): Promise<Array<{ lang: string; slug: string; url: string | null }>> {
  if (!i18nKey) return [];
  const { data, error } = await supabase
    .from("resources")
    .select("lang, slug, url")
    .eq("i18n_key", i18nKey)
    .not("slug", "is", null);
  if (error) return [];
  return (data ?? []).map((r) => ({
    lang: (r.lang as string) ?? "zh",
    slug: r.slug as string,
    url: (r.url as string) ?? null,
  }));
}

/**
 * 内容的真实日期(ISO 串)。
 * 每日栏目的 published_at 存的是【入库时间】,常比内容日期晚一天
 * (例:8/21 的简报 published_at 是 8/22T01:05)。slug 与 url 里带的
 * YYYY-MM-DD 才是内容日期,优先取它;取不到时回落 published_at。
 * 用 T12:00:00Z(正午)而非 T00,免得读者所在时区把日期读退一天。
 */
export function contentDate(r: Pick<Resource, "slug" | "url" | "published_at">): string {
  const m = `${r.slug ?? ""} ${r.url ?? ""}`.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? `${m[1]}T12:00:00Z` : r.published_at;
}

/** YYYY-MM-DD(按内容日期,不按入库时间) */
export function contentDay(r: Pick<Resource, "slug" | "url" | "published_at">): string {
  return contentDate(r).slice(0, 10);
}

/** 三个每日栏目的 subcategory —— 与 lib/columns.ts 的 DAILY_COLUMNS 对应 */
const DAILY_SUBS = new Set(["briefing", "daily", "claude-code"]);

/** 是不是每日栏目产出(简报/深度/Claude Code);false 表示手写长文 */
export function isDailyColumn(r: Pick<Resource, "subcategory">): boolean {
  return DAILY_SUBS.has(r.subcategory ?? "");
}
