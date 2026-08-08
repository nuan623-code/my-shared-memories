import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { ToolCard } from "@/components/ToolCard";
import { useT } from "@/lib/i18n/use-t";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/tools")({
  head: () =>
    i18nHead({
      path: "/tools",
      locale: "zh",
      title: "工具 — Mingyu's Library",
      description: "我自己做的东西:随读 SuiRead iOS App、公众号 Markdown 排版工具、Claude Code 学习站。",
    }),
  component: ToolsPage,
});

export function ToolsPage() {
  const t = useT();
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Wrench className="h-3.5 w-3.5" />
            {t("home.works.kicker")}
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t("tools.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("tools.desc")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.href} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
}
