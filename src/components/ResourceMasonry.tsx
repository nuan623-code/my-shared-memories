import type { Resource } from "@/lib/resources";
import { ResourceCard } from "./ResourceCard";

export function ResourceMasonry({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
        还没有资源，去发布第一个吧
      </div>
    );
  }
  // 网格而非 CSS 多列瀑布流:多列布局按「先竖后横」填充,时间倒序在视觉上会乱;
  // 网格按行左→右排,与 fetch 的 published_at 倒序一致,新内容永远在左上。
  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} />
      ))}
    </div>
  );
}
