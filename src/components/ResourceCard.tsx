import { Link } from "@tanstack/react-router";
import {
  FileText,
  Film,
  Link2,
  FileDown,
  StickyNote,
  Play,
  ExternalLink,
} from "lucide-react";
import {
  type Resource,
  formatBytes,
  hostnameOf,
  noteGradient,
} from "@/lib/resources";
import { getCategory } from "@/lib/data";
import { FavoriteButton } from "@/components/FavoriteButton";

const TYPE_ICON = {
  article: FileText,
  video: Film,
  link: Link2,
  file: FileDown,
  note: StickyNote,
};

export function ResourceCard({ resource: r }: { resource: Resource }) {
  const Icon = TYPE_ICON[r.type];
  const cat = getCategory(r.category);

  const tagPills = (
    <div className="mt-3 flex flex-wrap gap-1">
      {r.tags.slice(0, 4).map((t) => (
        <span
          key={t}
          className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          {t}
        </span>
      ))}
    </div>
  );

  // Header WITHOUT the favorite button (the button is rendered as a sibling
  // overlay so it never sits inside the <a> — nested interactive elements
  // make the HTML parser split the anchor and break navigation).
  const header = (
    <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {cat?.label ?? r.type}
      </span>
      <span>{new Date(r.published_at).toISOString().slice(0, 10)}</span>
    </div>
  );

  const favOverlay = (
    <div className="pointer-events-none absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <div className="pointer-events-auto rounded-md bg-card/90 shadow-sm backdrop-blur-sm">
        <FavoriteButton resourceId={r.id} />
      </div>
    </div>
  );

  // NOTE — colorful gradient bg
  if (r.type === "note") {
    return (
      <div
        className="group relative mb-4 break-inside-avoid rounded-2xl border border-border/60 p-5 shadow-sm transition-all hover:shadow-md"
        style={{ background: noteGradient(r.id) }}
      >
        {favOverlay}
        {header}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
          {r.content || r.title}
        </p>
        {r.tags.length > 0 && tagPills}
      </div>
    );
  }

  // LINK — external
  if (r.type === "link") {
    return (
      <div className="group relative mb-4 break-inside-avoid">
        {favOverlay}
        <a
          href={r.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
        >
          {header}
          {r.cover_url && (
            <img
              src={r.cover_url}
              alt=""
              className="mb-3 aspect-[16/9] w-full rounded-lg object-cover"
              loading="lazy"
            />
          )}
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
            {r.title}
          </h3>
          {r.summary && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {r.summary}
            </p>
          )}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-primary/80">
            <ExternalLink className="h-3 w-3" />
            {hostnameOf(r.url)}
          </div>
          {r.tags.length > 0 && tagPills}
        </a>
      </div>
    );
  }

  // FILE — download
  if (r.type === "file") {
    return (
      <div className="group relative mb-4 break-inside-avoid">
        {favOverlay}
        <a
          href={r.file_url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
        >
          {header}
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary/5 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileDown className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-muted-foreground uppercase">
                {r.file_type || "FILE"}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(r.file_size)}
              </div>
            </div>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
            {r.title}
          </h3>
          {r.summary && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {r.summary}
            </p>
          )}
          {r.tags.length > 0 && tagPills}
        </a>
      </div>
    );
  }

  // VIDEO
  if (r.type === "video") {
    const inner = (
      <>
        {header}
        <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-foreground/90">
          {r.cover_url ? (
            <img
              src={r.cover_url}
              alt=""
              className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-background/40">
              <Film className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-foreground shadow-lg transition-transform group-hover:scale-110">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
          {r.duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {r.duration}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
          {r.title}
        </h3>
        {r.summary && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {r.summary}
          </p>
        )}
        {r.tags.length > 0 && tagPills}
      </>
    );

    return (
      <div className="group relative mb-4 break-inside-avoid">
        {favOverlay}
        {r.slug ? (
          <Link
            to="/resources/$slug"
            params={{ slug: r.slug }}
            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
          >
            {inner}
          </Link>
        ) : (
          <a
            href={r.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
          >
            {inner}
          </a>
        )}
      </div>
    );
  }

  // ARTICLE (default)
  const articleInner = (
    <>
      {header}
      {r.cover_url && (
        <img
          src={r.cover_url}
          alt=""
          className="mb-3 aspect-[16/9] w-full rounded-lg object-cover"
          loading="lazy"
        />
      )}
      <h3 className="line-clamp-3 text-base font-semibold text-foreground group-hover:text-primary">
        {r.title}
      </h3>
      {r.summary && (
        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
          {r.summary}
        </p>
      )}
      {r.tags.length > 0 && tagPills}
    </>
  );

  return (
    <div className="group relative mb-4 break-inside-avoid">
      {favOverlay}
      {r.slug ? (
        <Link
          to="/articles/$slug"
          params={{ slug: r.slug }}
          className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
        >
          {articleInner}
        </Link>
      ) : (
        <div className="group rounded-2xl border border-border bg-card p-5">
          {articleInner}
        </div>
      )}
    </div>
  );
}
