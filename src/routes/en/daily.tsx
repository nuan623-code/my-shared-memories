import { createFileRoute } from "@tanstack/react-router";
import { DailyPage } from "../daily";
import { resourcesQO } from "../index";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/daily")({
  head: () =>
    i18nHead({
      path: "/daily",
      locale: "en",
      title: "Daily updates — Mingyu's Library",
      description:
        "Three threads published automatically every day: an AI briefing, a deep dive on one topic, and a Claude Code course.",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: DailyPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      Failed to load: {error.message}
    </div>
  ),
});
