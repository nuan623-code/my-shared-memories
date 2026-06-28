import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/articles/")({
  component: () => <Navigate to="/resources" />,
});
