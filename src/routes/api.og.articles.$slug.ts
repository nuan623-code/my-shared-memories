import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Wrap text into N lines roughly fitting maxChars per line, ellipsizing the last line.
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + w).length > maxChars) {
      if (cur.trim()) lines.push(cur.trim());
      cur = w.trimStart();
      if (lines.length === maxLines) break;
    } else {
      cur += w;
    }
  }
  if (cur.trim() && lines.length < maxLines) lines.push(cur.trim());
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > maxChars - 1) lines[maxLines - 1] = last.slice(0, maxChars - 1) + "…";
  }
  return lines;
}

export const Route = createFileRoute("/api/og/articles/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data } = await supabase
          .from("resources")
          .select("title, summary, category, subcategory, tags")
          .eq("slug", params.slug)
          .maybeSingle();

        const rawTitle = data?.title ?? "Mingyu's Library";
        const rawSummary = data?.summary ?? "技术笔记 · 学习记录 · 想法分享";
        const category = data?.category ?? "Library";
        const subcategory = data?.subcategory ?? "";
        const tags = (data?.tags ?? []).slice(0, 4);

        const titleLines = wrap(rawTitle, 22, 3);
        const summaryLines = wrap(rawSummary, 44, 2);
        const eyebrow = subcategory ? `${category} · ${subcategory}` : category;

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1e3f"/>
      <stop offset="0.5" stop-color="#11315f"/>
      <stop offset="1" stop-color="#1d4f8c"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7ec8e3" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#7ec8e3" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#5b8def" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#5b8def" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1100" cy="40" r="320" fill="url(#glow1)"/>
  <circle cx="80" cy="620" r="300" fill="url(#glow2)"/>
  <g font-family="'PingFang SC','Hiragino Sans GB','Microsoft YaHei',Inter,system-ui,sans-serif" fill="#ffffff">
    <g transform="translate(72,90)">
      <circle cx="6" cy="6" r="6" fill="#7ec8e3"/>
      <text x="22" y="12" font-size="22" fill="#8ec5ff" letter-spacing="3">MINGYU&#39;S LIBRARY</text>
    </g>
    <text x="72" y="180" font-size="24" fill="#cfe4ff" letter-spacing="1.5">${escape(eyebrow)}</text>
    ${titleLines
      .map((l, i) => `<text x="72" y="${260 + i * 78}" font-size="64" font-weight="800" fill="#ffffff">${escape(l)}</text>`)
      .join("\n    ")}
    ${summaryLines
      .map(
        (l, i) =>
          `<text x="72" y="${260 + titleLines.length * 78 + 40 + i * 38}" font-size="26" fill="#dbe9ff">${escape(l)}</text>`,
      )
      .join("\n    ")}
    <g transform="translate(72,540)">
      ${tags
        .map((t, i) => {
          const label = `#${t}`;
          const w = Math.min(280, label.length * 14 + 32);
          const x = i * 0;
          return `<g transform="translate(${tags.slice(0, i).reduce((acc, tg) => acc + Math.min(280, (`#${tg}`).length * 14 + 32) + 12, 0)},0)">
        <rect x="0" y="0" width="${w}" height="44" rx="22" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/>
        <text x="${w / 2}" y="29" font-size="22" fill="#eaf3ff" text-anchor="middle">${escape(label)}</text>
      </g>`;
        })
        .join("\n      ")}
    </g>
    <text x="1128" y="568" font-size="22" fill="#8ec5ff" letter-spacing="3" text-anchor="end">NUAN623 · LIBRARY</text>
  </g>
</svg>`;

        return new Response(svg, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
