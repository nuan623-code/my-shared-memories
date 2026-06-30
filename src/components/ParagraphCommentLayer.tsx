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
    if (!doc) return;
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
      const top = rect.top + (doc!.documentElement.scrollTop || doc!.body.scrollTop);
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
        const onResize = () => scan();
        win.addEventListener("scroll", onScroll, { passive: true });
        win.addEventListener("resize", onResize);
        // re-scan a few times in case images/fonts shift layout
        const t1 = window.setTimeout(scan, 400);
        const t2 = window.setTimeout(scan, 1200);
        cleanup = () => {
          win.removeEventListener("scroll", onScroll);
          win.removeEventListener("resize", onResize);
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
          if (y < -20 || y > (iframeRef.current?.clientHeight ?? 0) + 20) return null;
          const count = counts?.get(a.id) ?? 0;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActive(a)}
              style={{ top: `${y}px` }}
              className={`pointer-events-auto absolute right-2 -translate-y-1/2 inline-flex items-center justify-center rounded-full border text-[11px] font-medium transition-all ${
                count > 0
                  ? "h-6 min-w-6 bg-primary text-primary-foreground border-primary shadow-sm px-1.5"
                  : "h-6 w-6 bg-background/90 text-muted-foreground border-border shadow-sm opacity-60 hover:opacity-100 hover:text-primary hover:border-primary focus:opacity-100"
              }`}
              title={count > 0 ? `${count} 条批注` : "添加段落批注"}
            >
              {count > 0 ? (
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="h-3 w-3" />
                  {count}
                </span>
              ) : (
                <Plus className="h-3 w-3" />
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
