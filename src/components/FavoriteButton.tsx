import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/use-favorites";

export function FavoriteButton({
  resourceId,
  className = "",
  stopPropagation = true,
}: {
  resourceId: string;
  className?: string;
  stopPropagation?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: ids } = useFavoriteIds();
  const toggle = useToggleFavorite();
  const on = ids?.has(resourceId) ?? false;

  const onClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user) {
      toast.info("请先登录以收藏");
      navigate({ to: "/auth" });
      return;
    }
    toggle.mutate(
      { resourceId, on: !on },
      {
        onSuccess: () => toast.success(on ? "已移出书架" : "已加入书架"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "操作失败"),
      },
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? "移出书架" : "加入书架"}
      title={on ? "移出书架" : "加入书架"}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
        on
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${className}`}
    >
      <Bookmark className={`h-4 w-4 ${on ? "fill-current" : ""}`} />
    </button>
  );
}
