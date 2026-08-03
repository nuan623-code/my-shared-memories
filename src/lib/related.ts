import { supabase } from "@/integrations/supabase/client";
import type { Resource } from "./resources";

export async function fetchAdjacentArticles(current: Resource): Promise<{ prev: Resource | null; next: Resource | null }> {
  const [prevRes, nextRes] = await Promise.all([
    supabase.from("resources").select("*").eq("type", "article").lt("published_at", current.published_at)
      .order("published_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("resources").select("*").eq("type", "article").gt("published_at", current.published_at)
      .order("published_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  return { prev: (prevRes.data as Resource | null) ?? null, next: (nextRes.data as Resource | null) ?? null };
}

/** 按日期连载的栏目:每日简报 / 每日深度学习。这些栏目里「上一篇」应该是前一天,而不是全库里时间最近的任意一篇。 */
const DATED_SERIES = new Set(["briefing", "daily"]);

/** 该文章是否属于按日期连载的栏目 */
export function isDatedSeries(r: Resource): boolean {
  return !!r.subcategory && DATED_SERIES.has(r.subcategory);
}

/**
 * 在一份已取到的全量列表里就地找同栏目的前后一天。
 * 用于让翻页按钮和快捷键不必等一次网络往返(文章页本来就预取了全量列表)。
 * 排序键同样是 slug,理由见 fetchSeriesAdjacent。
 */
export function seriesAdjacentFrom(
  all: Resource[],
  current: Resource,
): { prev: Resource | null; next: Resource | null } | null {
  if (!isDatedSeries(current) || !current.slug) return null;
  const lang = current.lang ?? "zh";
  const list = all
    .filter(
      (r) =>
        r.type === "article" &&
        r.subcategory === current.subcategory &&
        (r.lang ?? "zh") === lang &&
        !!r.slug,
    )
    .sort((a, b) => a.slug!.localeCompare(b.slug!));
  const i = list.findIndex((r) => r.slug === current.slug);
  if (i < 0) return null;
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

/**
 * 同栏目内的前一天 / 后一天。只在同一 subcategory + 同一语言里找,
 * 免得在简报里按「前一天」翻到深度学习或英文版去。
 * 不属于连载栏目时返回 inSeries=false,调用方回落到全库的上一篇/下一篇。
 */
export async function fetchSeriesAdjacent(
  current: Resource,
): Promise<{ prev: Resource | null; next: Resource | null; inSeries: boolean }> {
  const sub = current.subcategory;
  if (!sub || !DATED_SERIES.has(sub)) return { prev: null, next: null, inSeries: false };
  // 按 slug 排序而不是 published_at:每日栏目的 slug 形如 ai-briefing-2026-08-03、
  // ai-daily-2026-07-28-xxx,日期是定宽前缀,字典序即日期序。
  // published_at 存的是入库时间,补发的几天会撞成同一个时间戳(07-29 与 07-30 就完全相同),
  // 用它做 lt/gt 会让同批补发的日期互相跳过、永远翻不到。
  if (!current.slug) return { prev: null, next: null, inSeries: true };
  const scope = () =>
    supabase
      .from("resources")
      .select("*")
      .eq("type", "article")
      .eq("subcategory", sub)
      .eq("lang", current.lang ?? "zh");
  const [prevRes, nextRes] = await Promise.all([
    scope().lt("slug", current.slug)
      .order("slug", { ascending: false }).limit(1).maybeSingle(),
    scope().gt("slug", current.slug)
      .order("slug", { ascending: true }).limit(1).maybeSingle(),
  ]);
  return {
    prev: (prevRes.data as Resource | null) ?? null,
    next: (nextRes.data as Resource | null) ?? null,
    inSeries: true,
  };
}

export async function fetchRelatedArticles(current: Resource, limit = 4): Promise<Resource[]> {
  if (!current.tags?.length && !current.category) return [];
  let q = supabase.from("resources").select("*").eq("type", "article").neq("id", current.id);
  if (current.tags?.length) q = q.overlaps("tags", current.tags);
  else if (current.category) q = q.eq("category", current.category);
  const { data } = await q.order("published_at", { ascending: false }).limit(limit);
  return (data ?? []) as Resource[];
}
