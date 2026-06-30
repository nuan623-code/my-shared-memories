import { supabase } from "@/integrations/supabase/client";

const SEEN_KEY = "ml.viewedToday";
function alreadyViewedToday(resourceId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    const today = new Date().toISOString().slice(0, 10);
    if (map[resourceId] === today) return true;
    map[resourceId] = today;
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(map));
    return false;
  } catch { return false; }
}

export async function trackView(resourceId: string, userId: string | null): Promise<void> {
  if (alreadyViewedToday(resourceId)) return;
  await supabase.from("article_views").insert({ resource_id: resourceId, viewer_id: userId });
}

export async function fetchTopViewed(days = 30, limit = 5): Promise<Array<{ resource_id: string; views: number }>> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await supabase
    .from("article_views")
    .select("resource_id")
    .gte("viewed_at", since)
    .limit(2000);
  const counts = new Map<string, number>();
  (data ?? []).forEach((row: { resource_id: string }) => counts.set(row.resource_id, (counts.get(row.resource_id) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([resource_id, views]) => ({ resource_id, views }));
}
