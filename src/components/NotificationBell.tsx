import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyNotifications, markAllRead, markRead, type Notification } from "@/lib/notifications";

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const unread = items.filter((i) => !i.read).length;

  async function refresh() {
    if (!user) return;
    const list = await fetchMyNotifications(user.id);
    setItems(list);
  }

  useEffect(() => {
    if (!user) { setItems([]); return; }
    refresh();
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  async function onToggle() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await markAllRead(user!.id);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    }
  }

  return (
    <div className="relative">
      <button
        type="button" onClick={onToggle}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="通知"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-destructive" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">通知</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">还没有通知</div>
            ) : items.map((n) => (
              <Link key={n.id} to={n.url ?? "/"} onClick={() => { markRead(n.id); setOpen(false); }}
                className="block border-b border-border/50 px-3 py-2.5 text-sm hover:bg-muted/50">
                <div className="font-medium text-foreground">{n.title}</div>
                {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("zh-CN")}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
