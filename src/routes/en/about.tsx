import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "../about";
import { resourcesQO } from "../index";
import { i18nHead } from "@/lib/i18n/head";
import { personJsonLd } from "@/lib/jsonld";

export const Route = createFileRoute("/en/about")({
  head: () =>
    i18nHead({
      path: "/about",
      locale: "en",
      title: "About — Mingyu Yang",
      description: "Who I am, what I ship every day, and how to reach me.",
      jsonLd: [personJsonLd()],
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQO),
  component: AboutPage,
});
