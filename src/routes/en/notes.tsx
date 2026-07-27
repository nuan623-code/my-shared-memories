import { createFileRoute } from "@tanstack/react-router";
import { NotesPage, notesQO } from "../notes";
import { i18nHead } from "@/lib/i18n/head";

export const Route = createFileRoute("/en/notes")({
  head: () =>
    i18nHead({
      path: "/notes",
      locale: "en",
      title: "Notes — Mingyu's Library",
      description: "An open board of short thoughts — anyone can post, comment and reply.",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQO),
  component: NotesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">Something went wrong: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center text-sm">Not found</div>,
});
