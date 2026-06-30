import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Highlighter, MessageSquarePlus, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Comments } from "@/components/Comments";
import { useAuth } from "@/hooks/use-auth";
import { createHighlight, readSelection, type SelectionInfo } from "@/lib/highlights";

type ToolbarState = {
  info: SelectionInfo;
  left: number;
  top: number;
};

// Listens for text selection inside the article iframe and shows a small
// floating toolbar: Highlight (private) / Comment (public).
export function SelectionToolbar({
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
  const [state, setState] = useState<ToolbarState | null>(null);
  const [sheet, setSheet] = useState<SelectionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const ignoreNextSelChangeRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cleanup: (() => void) | undefined;
    const onLoad = () => {
      cleanup?.();
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return;

      const updateFromSelection = () => {
        if (ignoreNextSelChangeRef.current) {
          ignoreNextSelChangeRef.current = false;
          return;
        }
        const info = readSelection(doc);
        if (!info) {
          setState(null);
          return;
        }
        const iframeRect = iframe.getBoundingClientRect();
        const left = iframeRect.left + info.rect.left + info.rect.width / 2;
        const top = iframeRect.top + info.rect.top - 8;
        setState({ info, left, top });
      };

      const onMouseUp = () => window.setTimeout(updateFromSelection, 10);
      const onKeyUp = () => window.setTimeout(updateFromSelection, 10);
      const onScroll = () => setState(null);

      doc.addEventListener("mouseup", onMouseUp);
      doc.addEventListener("keyup", onKeyUp);
      win.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => {
        doc.removeEventListener("mouseup", onMouseUp);
        doc.removeEventListener("keyup", onKeyUp);
        win.removeEventListener("scroll", onScroll);
      };
    };

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();
    return () => {
      iframe.removeEventListener("load", onLoad);
      cleanup?.();
    };
  }, [enabled, iframeRef]);

  // Dismiss toolbar when clicking outside it.
  useEffect(() => {
    if (!state) return;
    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("[data-selection-toolbar]")) return;
      setState(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [state]);

  const clearIframeSelection = () => {
    try {
      iframeRef.current?.contentWindow?.getSelection()?.removeAllRanges();
    } catch {
      // ignore
    }
  };

  const onHighlight = async () => {
    if (!state || !user) return;
    setBusy(true);
    try {
      await createHighlight({
        resourceId,
        userId: user.id,
        anchorId: state.info.anchorId,
        quote: state.info.quote,
        textOffset: state.info.textOffset,
        textLength: state.info.textLength,
      });
      qc.invalidateQueries({ queryKey: ["highlights", resourceId, user.id] });
      setState(null);
      clearIframeSelection();
    } finally {
      setBusy(false);
    }
  };

  const onComment = () => {
    if (!state) return;
    setSheet(state.info);
    setState(null);
    // Sheet steals focus → would fire selectionchange → swallow it once.
    ignoreNextSelChangeRef.current = true;
  };

  if (!enabled) return null;

  return (
    <>
      {state && (
        <div
          data-selection-toolbar
          style={{
            position: "fixed",
            left: state.left,
            top: state.top,
            transform: "translate(-50%, -100%)",
            zIndex: 60,
          }}
          className="flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-1 shadow-lg"
        >
          {user ? (
            <>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onHighlight}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                title="高亮（仅自己可见）"
              >
                <Highlighter className="h-3.5 w-3.5" /> 高亮
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onComment}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                title="评论（所有人可见）"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" /> 评论
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setState(null);
                  clearIframeSelection();
                }}
                className="inline-flex items-center rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="取消"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-primary hover:underline"
              onMouseDown={(e) => e.preventDefault()}
            >
              登录后即可高亮或评论
            </Link>
          )}
        </div>
      )}

      <Sheet open={!!sheet} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              划词评论
            </SheetTitle>
          </SheetHeader>
          {sheet && (
            <div className="mt-4">
              <Comments
                resourceId={resourceId}
                anchorId={sheet.anchorId}
                anchorText={sheet.quote}
                compact
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
