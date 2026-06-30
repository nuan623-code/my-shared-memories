import { supabase } from "@/integrations/supabase/client";
import { getFingerprint } from "./fingerprint";

export async function fetchLikeStats(resourceId: string, userId: string | null): Promise<{ count: number; liked: boolean }> {
  const fp = getFingerprint();
  const { count } = await supabase
    .from("article_likes")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", resourceId);
  let liked = false;
  if (userId) {
    const { data } = await supabase
      .from("article_likes").select("id").eq("resource_id", resourceId).eq("liker_id", userId).maybeSingle();
    liked = !!data;
  } else if (fp) {
    const { data } = await supabase
      .from("article_likes").select("id").eq("resource_id", resourceId).is("liker_id", null).eq("fingerprint", fp).maybeSingle();
    liked = !!data;
  }
  return { count: count ?? 0, liked };
}

export async function toggleLike(resourceId: string, userId: string | null, currentlyLiked: boolean): Promise<void> {
  const fp = getFingerprint();
  if (currentlyLiked) {
    const q = supabase.from("article_likes").delete().eq("resource_id", resourceId);
    if (userId) await q.eq("liker_id", userId);
    else await q.is("liker_id", null).eq("fingerprint", fp);
  } else {
    await supabase.from("article_likes").insert({
      resource_id: resourceId,
      liker_id: userId,
      fingerprint: userId ? null : fp,
    });
  }
}
