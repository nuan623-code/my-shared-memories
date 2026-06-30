import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { subscribeEmail } from "@/lib/subscribers";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await subscribeEmail(email, user?.id ?? null);
    setBusy(false);
    if (r.ok) { setDone(true); toast.success("订阅成功，新文章会通过邮件通知你"); }
    else toast.error(r.error ?? "订阅失败");
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
        <Check className="h-4 w-4" /> 已订阅
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`flex ${compact ? "gap-1.5" : "gap-2"} w-full max-w-sm`}>
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱地址"
          className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit" disabled={busy}
        className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >订阅</button>
    </form>
  );
}
