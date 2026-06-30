import { createFileRoute } from "@tanstack/react-router";

const body = `User-agent: *\nAllow: /\nSitemap: https://mingyuyang.com/sitemap.xml\n`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } }),
    },
  },
});
