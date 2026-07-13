import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useReadingMap, useSetReadingStatus, type ReadingState } from "@/hooks/use-reading-status";

// 待读/已读 标记按钮。未登录时不渲染(阅读状态是登录用户的私有数据)。
// 再点一次当前状态可清除标记(回到未读)。
export function ReadingStatusButtons({
  resourceId,
  showLabel = false,
  stopPropagation = true,
}: {
  resourceId: string;
  showLabel?: boolean;
  stopPropagation?: boolean;
}) {
  const { user } = useAuth();
  const { data: map } = useReadingMap();
  const set = useSetReadingStatus();
  if (!user) return null;
  const current = map?.get(resourceId) ?? null;

  const make = (target: ReadingState, Icon: typeof Check, label: string) => {
    const on = current === target;
    const onClick = (e: React.MouseEvent) => {
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
      const next = on ? null : target;
      set.mutate(
        { resourceId, status: next },
        {
          onSuccess: () =>
            toast.success(next ? `已标记${label}` : `已取消${label}标记`),
          onError: (err) => toast.error(err instanceof Error ? err.message : "操作失败"),
        },
      );
    };
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        title={on ? `取消${label}标记` : `标记为${label}`}
        className={`inline-flex h-7 items-center justify-center gap-1 rounded-md transition ${showLabel ? "px-2 text-xs" : "w-7"} ${
          on
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {showLabel && label}
      </button>
    );
  };

  return (
    <>
      {make("to_read", Clock, "待读")}
      {make("read", Check, "已读")}
    </>
  );
}
