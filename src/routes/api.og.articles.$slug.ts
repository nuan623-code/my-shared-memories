import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { buildOgSvg } from "@/lib/og-card.mjs";

// 分享卡的 SVG 版本。
//
// 注意:社交平台(微信、X、LinkedIn、Facebook)都不接受 SVG 作 og:image,
// 所以 <head> 里挂的不是这个地址,而是发布时由 scripts/generate-og.mjs 栅格化出来的
// /og/<slug>.jpg。这个路由留着的用处是:改模板时能直接在浏览器里看效果,
// 以及生成脚本之外有个随时可取的真源。
export const Route = createFileRoute("/api/og/articles/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data } = await supabase
          .from("resources")
          .select("title, summary, category, subcategory, tags")
          .eq("slug", params.slug)
          .maybeSingle();

        return new Response(buildOgSvg(data ?? {}), {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
