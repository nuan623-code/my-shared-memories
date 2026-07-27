import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SearchPage, qo } from "../search";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  type: fallback(z.enum(["all", "article", "video", "link", "file", "note"]), "all").default("all"),
});

// 搜索结果页对 SEO 无价值,不进 sitemap、不给 hreflang,仅作站内功能
export const Route = createFileRoute("/en/search")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [{ title: "Search — Mingyu's Library" }, { name: "robots", content: "noindex, follow" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: SearchPage,
});
