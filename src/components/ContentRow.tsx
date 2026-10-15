import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { resourceHref, isNew, contentDate, type Resource } from "@/lib/resources";
import { useT, useLocale } from "@/lib/i18n/use-t";

/**
 * 横向卡片带(一个栏目一行,左右滚)。
 *
 * 为什么是横滚而不是继续堆九宫格:首页原来一共只露出 12 条,而库里有 342 条。
 * 要把露出量提到一百条量级,纵向排法会把页面拉到十几屏;横滚一行就能放下十几张,
 * 八行不到四屏,还顺带把「这站有多少东西」这件事直接摆给人看。
 *
 * 滚动用原生 scroll-snap,不引第三方轮播库:原生的触摸惯性和无障碍行为是免费的,
 * 换成 JS 模拟反而要自己补一遍。箭头只在能滚的方向出现。
 */
export function ContentRow({
  title,
  kicker,
  color,
  moreTo,
  moreSearch,
  moreHref,
  moreLabel,
  items,
}: {
  title: string;
  kicker?: string;
  /** 栏目色点,和资源库里同一栏目的颜色对得上 */
  color?: string;
  /** 站内「查看全部」目标(与 moreHref 二选一) */
  moreTo?: string;
  /** 跟着 moreTo 走的查询参数,如 { col: "agent" } */
  moreSearch?: Record<string, string>;
  /** 站外/静态归档的「查看全部」目标 */
  moreHref?: string;
  moreLabel?: string;
  items: Resource[];
}) {
  const t = useT();
  const locale = useLocale();
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // 箭头的可用状态跟着实际滚动位置走。resize 也要重算 —— 窗口变宽后
  // 原本滚得动的一行可能已经全放得下了,这时不该再留个点不动的箭头。
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const sync = () => {
      const max = el.scrollWidth - el.clientWidth;
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft >= max - 1);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [items.length]);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    // 一次滚差不多一屏,但留一点重叠,免得边缘那张被整个推走、丢失上下文
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (items.length === 0) return null;

  const more = moreLabel ?? t("home.viewAll");

  return (
    <section className="border-b border-border/50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {kicker && (
              <div className="mb-1 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kicker}
              </div>
            )}
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground sm:text-xl">
              {color && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
              )}
              <span className="truncate">{title}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {items.length}
                {t("home.count")}
              </span>
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {moreTo ? (
              <Link
                to={moreTo}
                search={moreSearch as never}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {more}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : moreHref ? (
              <a
                href={moreHref}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {more}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            ) : null}
            {/* 手机上靠手指滑,不占位置放箭头 */}
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => nudge(-1)}
                disabled={atStart}
                aria-label={t("home.row.prev", { s: title })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => nudge(1)}
                disabled={atEnd}
                aria-label={t("home.row.next", { s: title })}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 滚动容器铺满整宽、用内边距对齐内容区,这样卡片能滚到贴边再出画,
          而不是在 max-w-7xl 的边界上被硬切 */}
      <div
        ref={scroller}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-1 [scroll-padding-left:1rem] xl:px-[max(1rem,calc((100vw-80rem)/2+1rem))]"
      >
        {items.map((r) => (
          <RowCard key={r.id} r={r} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function RowCard({ r, locale }: { r: Resource; locale: string }) {
  const t = useT();
  const href = resourceHref(r);
  const external = href.startsWith("http");
  const date = new Date(contentDate(r)).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });

  const card = (
    <article className="group flex h-full w-[76vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-border/70 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg sm:w-[280px]">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="tabular-nums text-muted-foreground">{date}</span>
        {isNew(contentDate(r)) && (
          <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
            {t("home.badge.new")}
          </span>
        )}
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition group-hover:text-primary">
        {r.title || t("home.untitled")}
      </h3>
      {r.summary?.trim() && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {r.summary}
        </p>
      )}
      <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
        {t("home.read")}
        <ArrowUpRight className="h-3 w-3" />
      </span>
    </article>
  );

  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className="flex">
      {card}
    </a>
  ) : (
    <Link to={href} className="flex">
      {card}
    </Link>
  );
}
