import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, FileCode, FileText, FileType, Loader2 } from "lucide-react";

type Format = "html" | "md" | "pdf";

const LABELS: Record<Format, { name: string; icon: typeof FileCode; ext: string }> = {
  html: { name: "HTML 原文", icon: FileCode, ext: "html" },
  md: { name: "Markdown", icon: FileText, ext: "md" },
  pdf: { name: "PDF", icon: FileType, ext: "pdf" },
};

function safeName(t: string) {
  return (t || "article").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

export function DownloadMenu({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function fetchWithProgress(u: string) {
    const res = await fetch(u);
    const total = Number(res.headers.get("Content-Length")) || 0;
    if (!res.body || !total) {
      const blob = await res.blob();
      setProgress(100);
      return blob;
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        setProgress(Math.round((received / total) * 100));
      }
    }
    return new Blob(chunks);
  }

  function triggerDownload(blob: Blob, name: string) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  async function handle(fmt: Format) {
    setOpen(false);
    setBusy(fmt);
    setDone(false);
    setProgress(0);
    const name = `${safeName(title)}.${LABELS[fmt].ext}`;
    setFileName(name);
    try {
      setStage("下载源文件");
      const blob = await fetchWithProgress(url);

      if (fmt === "html") {
        triggerDownload(blob, name);
      } else if (fmt === "md") {
        setStage("转换为 Markdown");
        setProgress(50);
        const html = await blob.text();
        const { default: TurndownService } = await import("turndown");
        const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
        const md = `# ${title}\n\n${td.turndown(html)}`;
        setProgress(100);
        triggerDownload(new Blob([md], { type: "text/markdown" }), name);
      } else {
        setStage("渲染为 PDF");
        setProgress(40);
        const html = await blob.text();
        const container = document.createElement("div");
        container.style.cssText = "position:fixed;left:-99999px;top:0;width:800px;padding:24px;background:#fff;color:#000;";
        container.innerHTML = html;
        document.body.appendChild(container);
        try {
          const { default: html2pdf } = await import("html2pdf.js");
          setProgress(70);
          await html2pdf()
            .from(container)
            .set({
              margin: 10,
              filename: name,
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .save();
          setProgress(100);
        } finally {
          container.remove();
        }
      }
      setDone(true);
      setTimeout(() => {
        setBusy(null);
        setDone(false);
        setStage("");
        setFileName("");
        setProgress(0);
      }, 2000);
    } catch (e) {
      setStage("下载失败");
      setTimeout(() => {
        setBusy(null);
        setStage("");
      }, 2500);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !busy && setOpen((v) => !v)}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-70"
      >
        {busy ? (
          done ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        下载
        {!busy && <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !busy && (
        <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          {(Object.keys(LABELS) as Format[]).map((f) => {
            const Icon = LABELS[f].icon;
            return (
              <button
                key={f}
                onClick={() => handle(f)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span>{LABELS[f].name}</span>
                <span className="ml-auto text-xs text-muted-foreground">.{LABELS[f].ext}</span>
              </button>
            );
          })}
        </div>
      )}

      {busy && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-border bg-card p-3 shadow-lg">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-foreground">{fileName}</span>
            <span className="shrink-0 text-muted-foreground">{progress}%</span>
          </div>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {done ? "下载完成" : stage || "准备中..."}
          </div>
        </div>
      )}
    </div>
  );
}
