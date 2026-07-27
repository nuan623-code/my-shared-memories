import { useState } from "react";
import { Check, Download, Highlighter, Loader2, MoonStar, Smartphone, WifiOff } from "lucide-react";

export const SUIREAD_APP_STORE_URL = "https://apps.apple.com/app/id6788002593";

function track(event: string) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("event", event);
}

/**
 * 文章尾部的随读 App 推广卡:本站文章可下载 HTML,导入随读离线阅读。
 * url 仅在本站本地 HTML(非外链)时传入,用于「下载本文 HTML」直达按钮。
 */
export function SuiReadPromo({ url, title }: { url?: string; title?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function downloadHtml() {
    if (!url || busy) return;
    setBusy(true);
    track("suiread_promo_download_html");
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const name = `${(title || "article").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80)}.html`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      // 下载失败静默收场,顶栏「下载」菜单仍可用
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <img
          src="/suiread-icon.png"
          alt="随读 SuiRead 图标"
          className="h-14 w-14 shrink-0 rounded-xl border border-border/60 shadow-sm"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            在 iPhone / iPad 上,用随读继续读
          </h3>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            随读(SuiRead)是我开发的 HTML 阅读器 App。把本站文章下载成 HTML
            导入随读,就能像读书一样离线阅读,进度自动记忆。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 text-primary" /> 离线阅读
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Highlighter className="h-3.5 w-3.5 text-primary" /> 高亮标注
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MoonStar className="h-3.5 w-3.5 text-primary" /> 护眼主题
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={SUIREAD_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("suiread_promo_appstore_click")}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Smartphone className="h-4 w-4" /> App Store 下载
            </a>
            {url && (
              <button
                type="button"
                onClick={downloadHtml}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-70"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : done ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                下载本文 HTML
              </button>
            )}
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground/80">
            HTML 存到「文件」后,在随读书架点加号导入即可打开。
          </p>
        </div>
      </div>
    </section>
  );
}
