import { createFileRoute } from "@tanstack/react-router";
import { HomePage, resourcesQO } from "../index";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/")({
  head: () =>
    i18nHead({
      path: "/",
      locale: "en",
      title: "Mingyu's Library — Notes on AI, engineering and growth",
      description:
        "A personal library: AI engineering deep dives, a daily AI briefing, mobile-growth notes and anything else worth keeping.",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      Failed to load: {error.message}
    </div>
  ),
});
