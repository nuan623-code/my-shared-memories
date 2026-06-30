import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "workers-og";
import { supabase } from "@/integrations/supabase/client";

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export const Route = createFileRoute("/api/og/articles/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data } = await supabase
          .from("resources")
          .select("title, summary, category, subcategory, tags, type")
          .eq("slug", params.slug)
          .maybeSingle();

        const title = escape((data?.title ?? "Mingyu's Library").slice(0, 90));
        const summary = escape((data?.summary ?? "技术笔记 · 学习记录 · 想法分享").slice(0, 140));
        const category = escape(data?.category ?? "Library");
        const subcategory = data?.subcategory ? escape(data.subcategory) : "";
        const tags = (data?.tags ?? []).slice(0, 4).map(escape);

        const html = `
<div style="display:flex;flex-direction:column;width:1200px;height:630px;padding:72px;background:linear-gradient(135deg,#0b1e3f 0%,#11315f 45%,#1d4f8c 100%);color:#f8fbff;font-family:Inter,system-ui,sans-serif;position:relative;">
  <div style="display:flex;align-items:center;gap:14px;font-size:22px;letter-spacing:2px;color:#8ec5ff;text-transform:uppercase;">
    <div style="width:12px;height:12px;border-radius:999px;background:#7ec8e3;"></div>
    <div style="display:flex;">Mingyu&#39;s Library</div>
  </div>
  <div style="display:flex;margin-top:28px;font-size:24px;color:#cfe4ff;letter-spacing:1px;">
    <div style="display:flex;">${category}${subcategory ? ` · ${subcategory}` : ""}</div>
  </div>
  <div style="display:flex;margin-top:36px;font-size:68px;font-weight:800;line-height:1.15;letter-spacing:-1px;color:#ffffff;">
    <div style="display:flex;">${title}</div>
  </div>
  <div style="display:flex;margin-top:32px;font-size:28px;line-height:1.5;color:#dbe9ff;max-width:1000px;">
    <div style="display:flex;">${summary}</div>
  </div>
  <div style="display:flex;margin-top:auto;align-items:center;justify-content:space-between;">
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      ${tags.map((t) => `<div style="display:flex;padding:10px 20px;border:1px solid rgba(255,255,255,0.3);border-radius:999px;font-size:22px;color:#eaf3ff;">#${t}</div>`).join("")}
    </div>
    <div style="display:flex;font-size:22px;color:#8ec5ff;letter-spacing:2px;">nuan623 · Library</div>
  </div>
  <div style="position:absolute;top:-160px;right:-160px;width:520px;height:520px;border-radius:999px;background:radial-gradient(circle,rgba(126,200,227,0.35),transparent 70%);display:flex;"></div>
  <div style="position:absolute;bottom:-200px;left:-120px;width:480px;height:480px;border-radius:999px;background:radial-gradient(circle,rgba(91,141,239,0.35),transparent 70%);display:flex;"></div>
</div>`;

        return new ImageResponse(html, {
          width: 1200,
          height: 630,
          format: "png",
          headers: {
            "cache-control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
