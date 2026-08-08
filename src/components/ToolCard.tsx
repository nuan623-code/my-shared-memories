import { ArrowUpRight, Wrench } from "lucide-react";
import type { ToolItem } from "@/lib/tools";
import { useT, useLocale } from "@/lib/i18n/use-t";

// 作品/工具卡(2026-08-08 重构阶段1:从首页抽出,首页作品带与 /tools 页共用)
export function ToolCard({ tool }: { tool: ToolItem }) {
  const t = useT();
  const locale = useLocale();
  return (
    <a
      href={locale === "en" && tool.hrefEn ? tool.hrefEn : tool.href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        if (tool.gaEvent) {
          (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", tool.gaEvent);
        }
      }}
    >
      <article className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
        <div>
          <div className="mb-3 flex items-center justify-between">
            {tool.icon ? (
              <img
                src={tool.icon}
                alt=""
                className="h-9 w-9 rounded-xl border border-border/60"
                loading="lazy"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition group-hover:bg-primary/20">
                <Wrench className="h-4 w-4 text-primary" />
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
              {tool.cta ?? t("home.open")}
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground transition group-hover:text-primary">
            {locale === "en" ? (tool.titleEn ?? tool.title) : tool.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {locale === "en" ? (tool.descEn ?? tool.desc) : tool.desc}
          </p>
        </div>
        {tool.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </a>
  );
}
