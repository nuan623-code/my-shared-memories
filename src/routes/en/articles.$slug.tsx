import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleDetailPage } from "../articles.$slug";
import { fetchResourceBySlug, fetchTranslations } from "@/lib/resources";
import { absUrl, SHARE_IMAGE } from "@/lib/site";

export const Route = createFileRoute("/en/articles/$slug")({
  loader: async ({ params }) => {
    const article = await fetchResourceBySlug(params.slug);
    if (!article) throw notFound();
    const alts = await fetchTranslations(article.i18n_key);
    return { article, alts };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const alts = loaderData?.alts ?? [];
    const title = `${a?.title ?? "Article"} — Mingyu's Library`;
    const description = (a?.summary || a?.title || "Notes and articles by Mingyu").slice(0, 200);
    const url = absUrl(`/en/articles/${params.slug}`);
    // 站内静态 HTML 文档以直链为规范地址(正文在 iframe 里,爬虫按直链索引全文)
    const canonical =
      a?.url && a.url.startsWith("/") && a.url.endsWith(".html") ? absUrl(a.url) : url;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "author", content: "Mingyu Yang" },
        ...(a?.tags?.length ? [{ name: "keywords", content: a.tags.join(", ") }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "en_US" },
        { property: "og:image", content: SHARE_IMAGE },
        { property: "og:site_name", content: "Mingyu's Library" },
        ...(a?.published_at
          ? [{ property: "article:published_time", content: new Date(a.published_at).toISOString() }]
          : []),
        ...(a?.updated_at
          ? [{ property: "article:modified_time", content: new Date(a.updated_at).toISOString() }]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: SHARE_IMAGE },
      ],
      links: [
        { rel: "canonical", href: canonical },
        ...(alts.length > 1
          ? [
              ...alts.map((t) => ({
                rel: "alternate",
                hreflang: t.lang === "en" ? "en" : "zh-Hans",
                href: absUrl(t.lang === "en" ? `/en/articles/${t.slug}` : `/articles/${t.slug}`),
              })),
              {
                rel: "alternate",
                hreflang: "x-default",
                href: absUrl(`/articles/${alts.find((t) => t.lang !== "en")?.slug ?? params.slug}`),
              },
            ]
          : []),
      ],
    };
  },
  component: function EnArticleRoute() {
    const { article } = Route.useLoaderData();
    return <ArticleDetailPage article={article} />;
  },
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">Article not found</div>
  ),
});
