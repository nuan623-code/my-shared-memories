import { supabase } from "@/integrations/supabase/client";

export type Highlight = {
  id: string;
  resource_id: string;
  user_id: string;
  anchor_id: string;
  quote: string;
  text_offset: number;
  text_length: number;
  color: string;
  note: string | null;
  created_at: string;
};

const ANCHOR_TAGS = ["P", "LI", "BLOCKQUOTE", "H2", "H3"];

// Mirrors ParagraphCommentLayer.hashAnchor so both layers agree on ids.
export function hashAnchor(text: string, index: number) {
  const sample = (text || "").replace(/\s+/g, " ").trim().slice(0, 120);
  let h = 5381;
  for (let i = 0; i < sample.length; i++) h = ((h << 5) + h + sample.charCodeAt(i)) | 0;
  return `p-${index}-${Math.abs(h).toString(36)}`;
}

// Make sure every anchor element in the doc has a data-anchor-id.
// ParagraphCommentLayer also assigns these, but we run independently in case it's off.
export function ensureAnchorIds(doc: Document) {
  const nodes = Array.from(doc.querySelectorAll("p, li, blockquote, h2, h3")) as HTMLElement[];
  nodes.forEach((el, i) => {
    const text = el.textContent?.trim() ?? "";
    if (text.length < 8) return;
    if (!el.dataset.anchorId) {
      el.dataset.anchorId = hashAnchor(text, i);
    }
  });
}

export type SelectionInfo = {
  anchorId: string;
  anchorText: string;
  quote: string;
  textOffset: number;
  textLength: number;
  rect: DOMRect;
};

function findAnchorAncestor(node: Node | null): HTMLElement | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      if (ANCHOR_TAGS.includes(el.tagName)) return el;
    }
    cur = cur.parentNode;
  }
  return null;
}

// Offset of the selection start within the anchor element's textContent.
function textOffsetWithin(root: Node, target: Node, targetOffset: number): number {
  let offset = 0;
  const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    if (n === target) return offset + targetOffset;
    offset += (n.nodeValue ?? "").length;
    n = walker.nextNode();
  }
  return -1;
}

export function readSelection(doc: Document): SelectionInfo | null {
  const win = doc.defaultView;
  if (!win) return null;
  const sel = win.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const quote = sel.toString().replace(/\s+/g, " ").trim();
  if (quote.length < 4) return null;
  const anchor = findAnchorAncestor(range.startContainer);
  if (!anchor) return null;
  ensureAnchorIds(doc);
  const anchorId = anchor.dataset.anchorId;
  if (!anchorId) return null;
  const anchorText = (anchor.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  let textOffset = textOffsetWithin(anchor, range.startContainer, range.startOffset);
  if (textOffset < 0) textOffset = 0;
  const rect = range.getBoundingClientRect();
  return { anchorId, anchorText, quote, textOffset, textLength: quote.length, rect };
}

// ---- DB ----

export async function fetchHighlights(resourceId: string, userId: string): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("resource_id", resourceId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as Highlight[];
}

export async function createHighlight(input: {
  resourceId: string;
  userId: string;
  anchorId: string;
  quote: string;
  textOffset: number;
  textLength: number;
  color?: string;
}) {
  const { data, error } = await supabase
    .from("highlights")
    .insert({
      resource_id: input.resourceId,
      user_id: input.userId,
      anchor_id: input.anchorId,
      quote: input.quote.slice(0, 500),
      text_offset: input.textOffset,
      text_length: input.textLength,
      color: input.color ?? "yellow",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Highlight;
}

export async function deleteHighlight(id: string) {
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) throw error;
}

// ---- DOM rendering ----

export const HIGHLIGHT_ATTR = "data-highlight-id";

function clearHighlights(doc: Document) {
  doc.querySelectorAll(`mark[${HIGHLIGHT_ATTR}]`).forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parent.normalize?.();
  });
}

function wrapRangeInAnchor(anchor: HTMLElement, quote: string, offsetHint: number, id: string) {
  const doc = anchor.ownerDocument;
  if (!doc) return false;
  const full = anchor.textContent ?? "";
  // Try the hinted offset first, fall back to first occurrence.
  let start = -1;
  if (offsetHint >= 0 && full.slice(offsetHint, offsetHint + quote.length) === quote) {
    start = offsetHint;
  } else {
    const idx = full.indexOf(quote);
    if (idx >= 0) start = idx;
  }
  if (start < 0) return false;
  const end = start + quote.length;

  // Walk text nodes and wrap segments that fall in [start, end).
  const walker = doc.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  const wraps: { node: Text; from: number; to: number }[] = [];
  let n = walker.nextNode() as Text | null;
  while (n) {
    const len = (n.nodeValue ?? "").length;
    const nodeStart = cursor;
    const nodeEnd = cursor + len;
    if (nodeEnd > start && nodeStart < end) {
      wraps.push({
        node: n,
        from: Math.max(0, start - nodeStart),
        to: Math.min(len, end - nodeStart),
      });
    }
    cursor = nodeEnd;
    if (cursor >= end) break;
    n = walker.nextNode() as Text | null;
  }
  if (wraps.length === 0) return false;

  wraps.forEach(({ node, from, to }) => {
    try {
      let target: Text = node;
      if (from > 0) target = target.splitText(from);
      if (to - from < (target.nodeValue ?? "").length) target.splitText(to - from);
      const mark = doc.createElement("mark");
      mark.setAttribute(HIGHLIGHT_ATTR, id);
      mark.style.backgroundColor = "rgba(253, 224, 71, 0.55)";
      mark.style.borderRadius = "2px";
      mark.style.padding = "0 1px";
      mark.style.cursor = "pointer";
      target.parentNode?.insertBefore(mark, target);
      mark.appendChild(target);
    } catch {
      // ignore individual wrap failures
    }
  });
  return true;
}

export function applyHighlights(doc: Document, highlights: Highlight[]) {
  ensureAnchorIds(doc);
  clearHighlights(doc);
  highlights.forEach((h) => {
    const anchor = doc.querySelector(`[data-anchor-id="${CSS.escape(h.anchor_id)}"]`) as HTMLElement | null;
    if (!anchor) return;
    wrapRangeInAnchor(anchor, h.quote, h.text_offset, h.id);
  });
}
