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
  let q = supabase
    .from("resources")
    .select("*")
    .order("published_at", { ascending: false });
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
