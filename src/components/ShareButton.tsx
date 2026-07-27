import { Share2 } from "lucide-react";
import { toast } from "sonner";

// 分享当前文章:移动端走系统分享面板(navigator.share),桌面端复制链接。
export function ShareButton({ title, url }: { title: string; url: string }) {
  const onClick = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // 用户取消分享面板时静默;其余情况落到复制
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制,去粘贴分享吧");
    } catch {
      toast.error("复制失败,请手动复制地址栏链接");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      title="分享这篇文章"
    >
      <Share2 className="h-3.5 w-3.5" />
      分享
    </button>
  );
}
