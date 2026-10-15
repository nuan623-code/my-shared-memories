import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { resourceHref, contentDate, type Resource } from "@/lib/resources";
import { categories, catLabel } from "@/lib/data";
import { useT, useLocale } from "@/lib/i18n/use-t";

const INTERVAL_MS = 7000;

/**
 * 首页头图轮播:几篇精选长文轮流占满一屏宽。
 *
 * 几个刻意的决定:
 * 1) 所有 slide 都在 DOM 里,靠 opacity 切换而不是只渲染当前那张。
 *    首页是本站被爬得最多的一页,只渲染一张等于把另外四篇的标题藏起来 ——
 *    那正好是这轮改版要解决的「内容多但露不出来」。
 * 2) 非当前 slide 加 aria-hidden + inert,免得读屏和 Tab 走进看不见的卡片。
 * 3) 尊重 prefers-reduced-motion:系统要求减少动态时不自动播放,只留手动切换。
 * 4) 没有封面图。全库 342 条里只有 19 条有 cover_url,做成图卡会有 320 条开天窗,
 *    所以这里走文字版式 + 渐变底,靠排版而不是靠配图撑场面。
 */
export function HeroCarousel({ items }: { items: Resource[] }) {
  const t = useT();
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const hovering = useRef(false);

  const count = items.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // 系统设了「减少动态」就不自动轮播 —— 自动位移对前庭敏感的人是实打实的不适
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!playing || count < 2) return;
    const id = setInterval(() => {
      if (!hovering.current) setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, count]);

  if (count === 0) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <section
      className="relative overflow-hidden border-b border-border/50 bg-card/40"
      aria-roledescription="carousel"
      aria-label={t("home.carousel.label")}
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocusCapture={() => (hovering.current = true)}
      onBlurCapture={() => (hovering.current = false)}
      onKeyDown={onKeyDown}
    >
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {/* 高度由最长的那张撑开(grid 叠放),切换时版面不会跳 */}
        <div className="grid">
          {items.map((r, i) => {
            const active = i === index;
            const cat = categories.find((c) => c.id === r.category);
            const href = resourceHref(r);
            const external = href.startsWith("http");
            const date = new Date(contentDate(r)).toLocaleDateString(
              locale === "en" ? "en-US" : "zh-CN",
              { year: "numeric", month: "long", day: "numeric" },
            );
            const body = (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {cat && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {cat ? catLabel(cat, locale) : t("res.uncategorized")}
                  </span>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
                <h3 className="max-w-3xl text-2xl font-bold leading-snug tracking-tight text-foreground transition group-hover:text-primary sm:text-4xl">
                  {r.title || t("home.untitled")}
                </h3>
                {r.summary?.trim() && (
                  <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {r.summary}
                  </p>
                )}
                <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition group-hover:shadow-primary/40">
                  {t("home.read")}
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </>
            );
            const shell = `group col-start-1 row-start-1 block transition-opacity duration-500 ${
              active ? "opacity-100" : "pointer-events-none opacity-0"
            }`;
            return external ? (
              <a
                key={r.id}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={shell}
                aria-hidden={!active}
                inert={!active}
              >
                {body}
              </a>
            ) : (
              <Link key={r.id} to={href} className={shell} aria-hidden={!active} inert={!active}>
                {body}
              </Link>
            );
          })}
        </div>

        {count > 1 && (
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t("home.carousel.prev")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t("home.carousel.next")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2" role="tablist">
              {items.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={t("home.carousel.goTo", { n: String(i + 1) })}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-7 bg-primary" : "w-2.5 bg-border hover:bg-primary/40"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? t("home.carousel.pause") : t("home.carousel.play")}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
