import { createFileRoute } from "@tanstack/react-router";
import { HomePage, resourcesQO, topViewedQO } from "../index";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/")({
  head: () =>
    i18nHead({
      path: "/",
      locale: "en",
      title: "Mingyu's Library — One AI topic, explained every day",
      description:
        "A daily AI briefing, a daily deep dive and a Claude Code course — three threads updated every day, plus long-form notes and tools.",
    }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(resourcesQO),
      context.queryClient.ensureQueryData(topViewedQO),
    ]),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      Failed to load: {error.message}
    </div>
  ),
});
