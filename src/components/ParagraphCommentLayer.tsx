import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Comments } from "@/components/Comments";

type Anchor = {
  id: string;
  text: string;
  top: number; // px relative to iframe content top
  height: number;
};

type CountRow = { anchor_id: string | null };

// Simple stable hash (djb2 → base36), short.
function hashAnchor(text: string, index: number) {
  const sample = (text || "").replace(/\s+/g, " ").trim().slice(0, 120);
  let h = 5381;
  for (let i = 0; i < sample.length; i++) h = ((h << 5) + h + sample.charCodeAt(i)) | 0;
  return `p-${index}-${Math.abs(h).toString(36)}`;
}

async function fetchAnchorCounts(resourceId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("comments")
    .select("anchor_id")
    .eq("resource_id", resourceId)
    .not("anchor_id", "is", null);
  if (error) throw error;
  const m = new Map<string, number>();
  ((data ?? []) as CountRow[]).forEach((r) => {
    if (!r.anchor_id) return;
    m.set(r.anchor_id, (m.get(r.anchor_id) ?? 0) + 1);
  });
  return m;
}

export function ParagraphCommentLayer({
  resourceId,
  iframeRef,
  enabled,
}: {
  resourceId: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  enabled: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [active, setActive] = useState<Anchor | null>(null);

  const { data: counts } = useQuery({
    queryKey: ["comment-anchor-counts", resourceId],
    queryFn: () => fetchAnchorCounts(resourceId),
    enabled,
  });

  const scan = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }
    if (!doc || !doc.body) return;
    // 外壳把 iframe 调成高度自适应(无内部滚动),iframe 上方还有提示条:
    // 标记要落在「容器坐标系」= iframe 在容器内的偏移 + 元素在文档内的绝对 top。
    const iframeTop = iframe.offsetTop;
    const nodes = Array.from(
      doc.querySelectorAll("p, li, blockquote, h2, h3"),
    ) as HTMLElement[];
    const items: Anchor[] = [];
    nodes.forEach((el, i) => {
      const text = el.textContent?.trim() ?? "";
      if (text.length < 8) return; // skip empty / tiny
      const id = el.dataset.anchorId || hashAnchor(text, i);
      el.dataset.anchorId = id;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return; // 布局未完成或隐藏元素,等 ResizeObserver 触发重扫
      const top = iframeTop + rect.top + (doc!.documentElement.scrollTop || doc!.body.scrollTop);
      items.push({ id, text: text.slice(0, 120), top, height: rect.height });
    });
    setAnchors(items);
  }, [iframeRef]);

  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cleanup: (() => void) | undefined;
    const onLoad = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) return;
        scan();
        const onScroll = () => {
          setScrollTop(doc.documentElement.scrollTop || doc.body.scrollTop);
        };
        win.addEventListener("scroll", onScroll, { passive: true });
        win.addEventListener("resize", scan);
        // 内容高度随图片/字体加载和外壳自适应不断变化,一次性延时重扫不够:
        // 用 ResizeObserver 盯住正文,任何布局变化都重扫(rAF 去抖)。
        let raf = 0;
        const onBodyResize = () => {
          window.cancelAnimationFrame(raf);
          raf = window.requestAnimationFrame(scan);
        };
        let ro: ResizeObserver | undefined;
        if (typeof ResizeObserver === "function" && doc.body) {
          ro = new ResizeObserver(onBodyResize);
          ro.observe(doc.body);
        }
        // 兜底重扫(极老浏览器无 ResizeObserver 时仍可用)
        const t1 = window.setTimeout(scan, 400);
        const t2 = window.setTimeout(scan, 1500);
        cleanup = () => {
          win.removeEventListener("scroll", onScroll);
          win.removeEventListener("resize", scan);
          ro?.disconnect();
          window.cancelAnimationFrame(raf);
          window.clearTimeout(t1);
          window.clearTimeout(t2);
        };
      } catch {
        // cross-origin — silently skip
      }
    };

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
      cleanup?.();
    };
  }, [enabled, iframeRef, scan]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {anchors.map((a) => {
          const y = a.top - scrollTop + Math.min(24, a.height / 2);
          const maxY =
            (iframeRef.current?.offsetTop ?? 0) + (iframeRef.current?.clientHeight ?? 0);
          if (y < -20 || y > maxY + 20) return null;
          const count = counts?.get(a.id) ?? 0;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActive(a)}
              style={{ top: `${y}px` }}
              className={`pointer-events-auto absolute right-3 -translate-y-1/2 inline-flex items-center justify-center rounded-full border text-xs font-semibold shadow-md transition-all hover:scale-110 ${
                count > 0
                  ? "h-7 min-w-7 bg-primary text-primary-foreground border-primary px-2"
                  : "h-7 w-7 bg-primary/90 text-primary-foreground border-primary/80 hover:bg-primary"
              }`}
              title={count > 0 ? `${count} 条批注` : "点击给这一段添加批注"}
            >
              {count > 0 ? (
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {count}
                </span>
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              段落批注
            </SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-4">
              <Comments
                resourceId={resourceId}
                anchorId={active.id}
                anchorText={active.text}
                compact
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
