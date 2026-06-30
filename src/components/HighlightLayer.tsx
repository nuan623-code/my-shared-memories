import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  applyHighlights,
  deleteHighlight,
  fetchHighlights,
  HIGHLIGHT_ATTR,
  type Highlight,
} from "@/lib/highlights";

// Renders the current user's private highlights inside the article iframe
// and lets them click a highlight to delete it.
export function HighlightLayer({
  resourceId,
  iframeRef,
  enabled,
}: {
  resourceId: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  enabled: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const popupRef = useRef<HTMLDivElement | null>(null);

  const { data: highlights } = useQuery({
    queryKey: ["highlights", resourceId, user?.id ?? "anon"],
    queryFn: () => (user ? fetchHighlights(resourceId, user.id) : Promise.resolve<Highlight[]>([])),
    enabled: !!user && enabled,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteHighlight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["highlights", resourceId, user?.id] }),
  });

  // (Re)render highlights when data changes or iframe reloads.
  useEffect(() => {
    if (!enabled || !user) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const list = highlights ?? [];

    const paint = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      applyHighlights(doc, list);

      // Click on a highlight → show floating "delete" button just below it.
      const onClick = (e: Event) => {
        const target = e.target as HTMLElement | null;
        const mark = target?.closest?.(`mark[${HIGHLIGHT_ATTR}]`) as HTMLElement | null;
        if (!mark) {
          hidePopup();
          return;
        }
        const id = mark.getAttribute(HIGHLIGHT_ATTR);
        if (!id) return;
        showDeletePopup(mark, id);
      };
      doc.addEventListener("click", onClick);

      const onScroll = () => hidePopup();
      doc.defaultView?.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        doc.removeEventListener("click", onClick);
        doc.defaultView?.removeEventListener("scroll", onScroll);
      };
    };

    let cleanup: (() => void) | undefined;
    const onLoad = () => {
      cleanup?.();
      cleanup = paint();
    };
    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
      cleanup?.();
    };
  }, [highlights, enabled, user, iframeRef]);

  const showDeletePopup = (mark: HTMLElement, id: string) => {
    const iframe = iframeRef.current;
    const popup = popupRef.current;
    if (!iframe || !popup) return;
    const rect = mark.getBoundingClientRect();
    const iframeRect = iframe.getBoundingClientRect();
    popup.style.display = "flex";
    popup.style.left = `${iframeRect.left + rect.left + rect.width / 2 - 40}px`;
    popup.style.top = `${iframeRect.top + rect.bottom + 6}px`;
    popup.dataset.targetId = id;
  };
  const hidePopup = () => {
    const popup = popupRef.current;
    if (popup) popup.style.display = "none";
  };

  if (!enabled || !user) return null;

  return (
    <div
      ref={popupRef}
      style={{ position: "fixed", display: "none", zIndex: 50 }}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs shadow-md"
    >
      <button
        type="button"
        onClick={() => {
          const id = popupRef.current?.dataset.targetId;
          if (id) remove.mutate(id);
          hidePopup();
        }}
        className="text-destructive hover:underline"
      >
        删除高亮
      </button>
    </div>
  );
}
