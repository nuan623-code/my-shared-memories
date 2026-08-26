import { createFileRoute } from "@tanstack/react-router";
import { ResourcesPage, allResourcesQO, validateResourcesSearch } from "../resources";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/resources")({
  validateSearch: validateResourcesSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(allResourcesQO),
  head: () =>
    i18nHead({
      path: "/resources",
      locale: "en",
      title: "Library — Mingyu's Library",
      description:
        "Browse everything by section: long-form notes plus three daily columns (AI briefing, deep dives, Claude Code).",
    }),
  component: ResourcesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Something went wrong: {error.message}
    </div>
  ),
});
