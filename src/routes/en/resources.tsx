import { createFileRoute } from "@tanstack/react-router";
import { ResourcesPage } from "../resources";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/resources")({
  head: () =>
    i18nHead({
      path: "/resources",
      locale: "en",
      title: "Library — Mingyu's Library",
      description: "Browse every article, video, link, file and note, filterable by type, category and language.",
    }),
  component: ResourcesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Something went wrong: {error.message}</div>
  ),
});
