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
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} />
      ))}
    </div>
  );
}
