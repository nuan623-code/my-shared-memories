import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  created_at: string;
}

export async function fetchMyNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function markRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}
