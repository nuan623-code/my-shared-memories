import { createFileRoute } from "@tanstack/react-router";
import { ToolsPage } from "../tools";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/tools")({
  head: () =>
    i18nHead({
      path: "/tools",
      locale: "en",
      title: "Tools — Mingyu's Library",
      description: "Things I've built: the SuiRead iOS app, a WeChat Markdown formatter and a Claude Code learning hub.",
    }),
  component: ToolsPage,
});
