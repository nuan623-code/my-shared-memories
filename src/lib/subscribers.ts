import { supabase } from "@/integrations/supabase/client";

export async function subscribeEmail(email: string, userId: string | null): Promise<{ ok: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return { ok: false, error: "邮箱格式不正确" };
  const { error } = await supabase.from("subscribers").insert({ email: normalized, user_id: userId });
  if (error) {
    if (error.code === "23505") return { ok: true }; // already subscribed
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
