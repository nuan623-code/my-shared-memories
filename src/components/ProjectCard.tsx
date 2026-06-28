import { Link } from "@tanstack/react-router";
import { Calendar, ArrowUpRight, PlayCircle } from "lucide-react";
import type { Project, CategoryId } from "@/lib/data";
import { getCategory, getSubcategoryLabel } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categoryStyles: Record<
  CategoryId,
  { bg: string; text: string; border: string }
> = {
  web: { bg: "bg-cat-web/15", text: "text-cat-web", border: "border-cat-web/30" },
  game: { bg: "bg-cat-game/15", text: "text-cat-game", border: "border-cat-game/30" },
  ai: { bg: "bg-cat-ai/15", text: "text-cat-ai", border: "border-cat-ai/30" },
  homework: { bg: "bg-cat-homework/15", text: "text-cat-homework", border: "border-cat-homework/30" },
  article: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  video: { bg: "bg-accent/20", text: "text-foreground", border: "border-accent/40" },
};

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const style = categoryStyles[project.category];

  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
    >
      <div className={cn("flex h-40 items-center justify-center", style.bg)}>
        <div className={cn("text-4xl font-bold", style.text)}>
          {project.title.slice(0, 2)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              style.bg,
              style.text,
              style.border
            )}
          >
            {categoryLabels[project.category]}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {project.date}
          </span>
        </div>

        <h3 className="mb-2 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {project.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {project.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          查看详情
          <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}
