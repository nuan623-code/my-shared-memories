import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "../about";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/about")({
  head: () =>
    i18nHead({
      path: "/about",
      locale: "en",
      title: "About — Mingyu Yang",
      description:
        "10+ years in mobile internet. Writing about AI engineering, software practice, data analysis and product.",
    }),
  component: AboutPage,
});
