import { Mail, Rss } from "lucide-react";
import { SubscribeForm } from "@/components/SubscribeForm";
import { useT } from "@/lib/i18n/use-t";

// 全站唯一的订阅入口(2026-08-26 重构阶段 4:「订阅入口统一」)。
// 首页、文章文末、关于页都用这一个,别再各写各的样式和文案。
// 两条订阅路径都给:留邮箱,或者拿 RSS 自己收(/rss.xml 见 routes/rss[.]xml.tsx)。
export function SubscribeCard({
  variant = "panel",
  className = "",
}: {
  /** panel = 独立卡片(首页右栏);inline = 嵌在正文流里的浅底块(文章文末、关于页) */
  variant?: "panel" | "inline";
  className?: string;
}) {
  const t = useT();
  const panel = variant === "panel";

  return (
    // 类名必须写全:Tailwind 是静态扫源码的,`rounded-${x}` 这种拼出来的类不会被生成
    <aside
      className={`border border-border bg-card ${
        panel ? "rounded-3xl p-8" : "rounded-2xl p-5"
      } ${className}`}
    >
      <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
        <Mail className="h-3.5 w-3.5" /> {t("sub.kicker")}
      </div>
      <h3 className={`font-semibold text-foreground ${panel ? "text-xl" : "text-base"}`}>
        {t("sub.title")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("sub.desc")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubscribeForm />
        <a
          href="/rss.xml"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Rss className="h-3.5 w-3.5" />
          {t("sub.rss")}
        </a>
      </div>
    </aside>
  );
}
