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

export async function fetchRelatedArticles(current: Resource, limit = 4): Promise<Resource[]> {
  if (!current.tags?.length && !current.category) return [];
  let q = supabase.from("resources").select("*").eq("type", "article").neq("id", current.id);
  if (current.tags?.length) q = q.overlaps("tags", current.tags);
  else if (current.category) q = q.eq("category", current.category);
  const { data } = await q.order("published_at", { ascending: false }).limit(limit);
  return (data ?? []) as Resource[];
}
