import { supabase } from "@/integrations/supabase/client";

export interface NotePost {
  id: string;
  title: string | null;
  content: string | null;
  cover_url: string | null;
  tags: string[];
  owner_id: string | null;
  published_at: string;
  created_at: string;
  author?: { display_name: string; title: string; avatar_preset?: string | null } | null;
  comment_count?: number;
  favorite_count?: number;
}

export async function fetchNotePosts(): Promise<NotePost[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, content, cover_url, tags, owner_id, published_at, created_at")
    .eq("type", "note")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const posts = (data ?? []) as NotePost[];
  if (posts.length === 0) return posts;

  const ownerIds = Array.from(new Set(posts.map((p) => p.owner_id).filter(Boolean))) as string[];
  const ids = posts.map((p) => p.id);

  const [profilesRes, commentsRes, favsRes] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, display_name, title, avatar_preset").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null } as const),
    supabase.from("comments").select("resource_id").in("resource_id", ids),
    supabase.from("favorites").select("resource_id").in("resource_id", ids),
  ]);

  const profileMap = new Map<string, { display_name: string; title: string; avatar_preset?: string | null }>();
  (profilesRes.data ?? []).forEach((p: any) =>
    profileMap.set(p.id, { display_name: p.display_name, title: p.title, avatar_preset: p.avatar_preset }),
  );
  const commentCount = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c: any) =>
    commentCount.set(c.resource_id, (commentCount.get(c.resource_id) ?? 0) + 1),
  );
  const favCount = new Map<string, number>();
  (favsRes.data ?? []).forEach((f: any) =>
    favCount.set(f.resource_id, (favCount.get(f.resource_id) ?? 0) + 1),
  );

  return posts.map((p) => ({
    ...p,
    author: p.owner_id ? profileMap.get(p.owner_id) ?? null : null,
    comment_count: commentCount.get(p.id) ?? 0,
    favorite_count: favCount.get(p.id) ?? 0,
  }));
}

export async function createNotePost(input: {
  title: string;
  content: string;
  tags: string[];
  cover_url: string | null;
}): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("请先登录");
  const { data, error } = await supabase
    .from("resources")
    .insert({
      type: "note",
      title: input.title || null,
      content: input.content,
      tags: input.tags,
      cover_url: input.cover_url,
      owner_id: u.user.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteNotePost(id: string): Promise<void> {
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadNoteImage(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("请先登录");
  const ext = file.name.split(".").pop() || "png";
  const path = `notes/${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from("resources").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (up.error) throw up.error;
  // Bucket is private; use a long-lived signed URL (1 year).
  const signed = await supabase.storage
    .from("resources")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}
