import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchLikeStats, toggleLike } from "@/lib/likes";

export function LikeButton({ resourceId }: { resourceId: string }) {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLikeStats(resourceId, user?.id ?? null).then((s) => {
      if (!cancelled) { setCount(s.count); setLiked(s.liked); }
    });
    return () => { cancelled = true; };
  }, [resourceId, user?.id]);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    try { await toggleLike(resourceId, user?.id ?? null, liked); }
    catch { setLiked(liked); setCount((c) => c + (nextLiked ? -1 : 1)); }
    finally { setBusy(false); }
  }

  return (
    <button
      type="button" onClick={onClick} disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${
        liked
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
      title={liked ? "取消点赞" : "点赞"}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
