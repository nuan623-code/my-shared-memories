import { Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  Globe2,
  Pause,
  Play,
} from "lucide-react";
import { resourceHref, contentDate, type Resource } from "@/lib/resources";
import { subLabel } from "@/lib/library";
import { localizedPath } from "@/lib/i18n";
import { useT, useLocale } from "@/lib/i18n/use-t";

const INTERVAL_MS = 7000;
const TOPICS = ["all", "ai", "claude", "growth"] as const;
type Topic = (typeof TOPICS)[number];

// Browsing groups for this carousel, not changes to the resource taxonomy.
function topicOf(resource: Resource): Exclude<Topic, "all"> {
  if (resource.category === "article" || resource.slug?.startsWith("overseas-")) return "growth";
  if (
    resource.subcategory === "claude-code" ||
    /claude[\s-]*code/i.test([resource.title, resource.slug, ...resource.tags].join(" "))
  )
    return "claude";
  return "ai";
}

const topicIcons = { ai: BookOpen, claude: Code2, growth: Globe2 };
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const roundButton = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-40 ${focusRing}`;

/** Three visible cards; every featured article remains in the server-rendered HTML. */
export function HeroCarousel({ items }: { items: Resource[] }) {
  const t = useT();
  const locale = useLocale();
  const directoryId = useId();
  const slidesId = useId();
  const [selection, setSelection] = useState<{ topic: Topic; id: string | null }>({
    topic: "all",
    id: null,
  });
  const [playing, setPlaying] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const hovering = useRef(false);
  const focused = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const topicCounts = useMemo(() => {
    const counts = { all: items.length, ai: 0, claude: 0, growth: 0 };
    for (const item of items) counts[topicOf(item)] += 1;
    return counts;
  }, [items]);
  // Query refreshes can remove the selected article or topic; fall back without an empty slide.
  const topic = topicCounts[selection.topic] ? selection.topic : "all";
  const filtered = useMemo(
    () => items.filter((item) => topic === "all" || topicOf(item) === topic),
    [items, topic],
  );
  const count = filtered.length;
  const index = Math.max(
    0,
    filtered.findIndex((item) => item.id === selection.id),
  );
  const current = filtered[index];
  const canRotate = count > 1;

  const go = (next: number) => {
    if (!count) return;
    setPlaying(false);
    setSelection({ topic, id: filtered[((next % count) + count) % count].id });
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      if (mq.matches) setPlaying(false);
    };
    mq.addEventListener("change", stop);
    return () => mq.removeEventListener("change", stop);
  }, []);

  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setInterval(() => {
      if (hovering.current || focused.current || document.hidden) return;
      setSelection((previous) => {
        const active = Math.max(
          0,
          filtered.findIndex((item) => item.id === previous.id),
        );
        return { topic, id: filtered[(active + 1) % count].id };
      });
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, filtered, count, topic]);

  if (!current) return null;

  const labelFor = (item: Resource) => t(`home.carousel.topic.${topicOf(item)}`);
  const sectionFor = (item: Resource) =>
    item.subcategory ? subLabel(item.subcategory, locale) : labelFor(item);
  const position = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  const preview = (item: Resource, direction: "prev" | "next", nextIndex: number) => {
    const Icon = topicIcons[topicOf(item)];
    const Arrow = direction === "prev" ? ChevronLeft : ChevronRight;
    const placement =
      count === 2
        ? "col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
        : direction === "prev"
          ? "col-start-1 row-start-2 sm:row-start-1"
          : "col-start-2 row-start-2 sm:col-start-3 sm:row-start-1";
    return (
      <button
        type="button"
        onClick={() => go(nextIndex)}
        aria-label={`${t(`home.carousel.${direction}`)}: ${item.title || t("home.untitled")}`}
        className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none sm:my-6 sm:h-auto sm:self-center ${placement} ${focusRing}`}
      >
        <span className="hidden min-h-28 flex-col justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-primary/10 to-secondary/10 p-5 sm:flex">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-display text-lg font-semibold text-foreground">
            {sectionFor(item)}
          </span>
        </span>
        <span className="flex flex-1 flex-col p-3.5 sm:min-h-48 sm:p-5">
          <span className="text-xs text-muted-foreground">{labelFor(item)}</span>
          <span className="mt-2 mb-4 line-clamp-3 break-words text-sm leading-relaxed font-semibold text-foreground transition group-hover:text-primary sm:line-clamp-4 sm:text-base">
            {item.title || t("home.untitled")}
          </span>
          <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
            {direction === "prev" && <Arrow className="h-3.5 w-3.5" aria-hidden="true" />}
            {t(`home.carousel.${direction}`)}
            {direction === "next" && <Arrow className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
        </span>
      </button>
    );
  };

  return (
    <section
      className="border-b border-border/50 px-4 py-8 sm:py-10"
      aria-roledescription="carousel"
      aria-label={t("home.carousel.label")}
      onMouseEnter={() => {
        hovering.current = true;
      }}
      onMouseLeave={() => {
        hovering.current = false;
      }}
      onFocusCapture={() => {
        focused.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) focused.current = false;
      }}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          go(index + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div className="mx-auto max-w-7xl rounded-3xl border border-border bg-muted/40 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary">{t("site.name")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("home.carousel.title")}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {t("home.carousel.count", { n: count })}
          </span>
        </div>

        <div
          className="mt-5 mb-5 flex flex-wrap gap-2"
          role="group"
          aria-label={t("home.carousel.filter")}
        >
          {TOPICS.filter((entry) => topicCounts[entry] > 0).map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={topic === entry}
              onClick={() => {
                setPlaying(false);
                setSelection({ topic: entry, id: null });
              }}
              className={`min-h-11 rounded-full border px-4 py-2 text-xs font-medium transition ${topic === entry ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"} ${focusRing}`}
            >
              {t(`home.carousel.topic.${entry}`)}
              <span className="ml-1.5 tabular-nums opacity-75">{topicCounts[entry]}</span>
            </button>
          ))}
        </div>

        <div
          id={slidesId}
          className={`grid grid-cols-2 gap-3 sm:gap-4 ${count > 2 ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,2.15fr)_minmax(0,1fr)]" : count === 2 ? "sm:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)]" : "sm:grid-cols-1"}`}
          style={{ touchAction: "pan-y pinch-zoom" }}
          onTouchStart={(event) => {
            touchStart.current =
              event.touches.length === 1
                ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
                : null;
          }}
          onTouchCancel={() => {
            touchStart.current = null;
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start || !canRotate || !event.changedTouches.length) return;
            const dx = event.changedTouches[0].clientX - start.x;
            const dy = event.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.25) {
              suppressClickUntil.current = Date.now() + 500;
              go(index + (dx < 0 ? 1 : -1));
            }
          }}
          onClickCapture={(event) => {
            if (Date.now() < suppressClickUntil.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {count > 2 && preview(filtered[(index - 1 + count) % count], "prev", index - 1)}
          <div
            className={`col-span-2 col-start-1 row-start-1 grid min-w-0 sm:col-span-1 ${count > 2 ? "sm:col-start-2" : "sm:col-start-1"}`}
          >
            {items.map((item) => {
              const active = item.id === current.id;
              const matches = topic === "all" || topicOf(item) === topic;
              const Icon = topicIcons[topicOf(item)];
              const href = resourceHref(item);
              const external = /^https?:\/\//.test(href);
              const body = (
                <>
                  <div className="flex min-h-28 items-center justify-between gap-4 border-b border-primary/10 bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/10 px-5 py-5 sm:px-6">
                    <div>
                      <span className="text-[10px] font-semibold tracking-[0.18em] text-primary">
                        MINGYU'S LIBRARY
                      </span>
                      <p className="mt-2 font-display text-2xl font-semibold text-foreground">
                        {sectionFor(item)}
                      </p>
                    </div>
                    <Icon
                      className="h-9 w-9 shrink-0 text-primary/60"
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{labelFor(item)}</span>
                      <time dateTime={contentDate(item)}>
                        {new Date(contentDate(item)).toLocaleDateString(
                          locale === "en" ? "en-US" : "zh-CN",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "Asia/Shanghai",
                          },
                        )}
                      </time>
                    </div>
                    <h3 className="mt-3 line-clamp-4 break-words text-xl leading-snug font-semibold tracking-tight text-foreground transition group-hover:text-primary lg:text-2xl">
                      {item.title || t("home.untitled")}
                    </h3>
                    {item.summary?.trim() && (
                      <p className="mt-3 mb-5 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
                        {item.summary}
                      </p>
                    )}
                    <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-3 text-sm font-semibold text-primary">
                      {t("home.carousel.read")}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </>
              );
              const shell = `group col-start-1 row-start-1 min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-lg shadow-primary/5 transition-opacity duration-300 motion-reduce:transition-none ${matches ? "flex" : "hidden"} ${active ? "opacity-100" : "pointer-events-none opacity-0"} ${focusRing}`;
              return external ? (
                <a
                  key={item.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={shell}
                  aria-hidden={!active}
                  inert={!active}
                >
                  {body}
                </a>
              ) : (
                <Link
                  key={item.id}
                  to={localizedPath(href, locale)}
                  className={shell}
                  aria-hidden={!active}
                  inert={!active}
                >
                  {body}
                </Link>
              );
            })}
          </div>
          {canRotate && preview(filtered[(index + 1) % count], "next", index + 1)}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t("home.carousel.prev")}
              disabled={!canRotate}
              className={roundButton}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center text-xs text-muted-foreground tabular-nums">
              {position}
            </span>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t("home.carousel.next")}
              disabled={!canRotate}
              className={roundButton}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canRotate && (
              <button
                type="button"
                aria-pressed={playing}
                onClick={() => setPlaying((value) => !value)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs ${playing ? "text-primary" : "text-muted-foreground hover:text-primary"} ${focusRing}`}
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t(playing ? "home.carousel.pause" : "home.carousel.play")}
              </button>
            )}
            <button
              type="button"
              aria-expanded={directoryOpen}
              aria-controls={directoryId}
              onClick={() => setDirectoryOpen((value) => !value)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs text-muted-foreground hover:text-primary ${focusRing}`}
            >
              {t(directoryOpen ? "home.carousel.hideDirectory" : "home.carousel.showDirectory")}
              {directoryOpen ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <ol
          id={directoryId}
          hidden={!directoryOpen}
          aria-label={t("home.carousel.directory")}
          className="mt-4 divide-y divide-border border-t border-border"
        >
          {filtered.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={itemIndex === index ? "true" : undefined}
                aria-controls={slidesId}
                onClick={() => go(itemIndex)}
                className={`flex min-h-11 w-full items-baseline gap-3 rounded-md px-2 py-3 text-left text-sm leading-relaxed transition hover:bg-primary/5 ${itemIndex === index ? "font-medium text-primary" : "text-foreground"} ${focusRing}`}
              >
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {String(itemIndex + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 break-words">{item.title || t("home.untitled")}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">
          {t("home.carousel.status", { n: index + 1, total: count })}:{" "}
          {current.title || t("home.untitled")}
        </p>
      </div>
    </section>
  );
}
