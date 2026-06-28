import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, ExternalLink, Github } from "lucide-react";
import { getProjectById, categories } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => {
    const project = getProjectById(params.id);
    return {
      meta: [
        { title: project ? `${project.title} — Mingyu Yang` : "项目详情 — Mingyu Yang" },
        { name: "description", content: project?.description || "" },
      ],
    };
  },
  component: ProjectDetailPage,
});

const categoryStyles: Record<string, { bg: string; text: string }> = {
  web: { bg: "bg-cat-web/15", text: "text-cat-web" },
  game: { bg: "bg-cat-game/15", text: "text-cat-game" },
  ai: { bg: "bg-cat-ai/15", text: "text-cat-ai" },
  homework: { bg: "bg-cat-homework/15", text: "text-cat-homework" },
};

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const project = getProjectById(id);

  if (!project) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-semibold text-foreground">项目未找到</h1>
        <p className="mt-2 text-muted-foreground">该项目不存在或已被移除</p>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          返回项目列表
        </Link>
      </div>
    );
  }

  const catStyle = categoryStyles[project.category] || { bg: "bg-muted", text: "text-muted-foreground" };
  const catLabel = categories.find((c) => c.id === project.category)?.label || project.category;

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/projects"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回项目列表
        </Link>

        <div className={cn("mb-6 flex h-48 items-center justify-center rounded-2xl", catStyle.bg)}>
          <div className={cn("text-6xl font-bold", catStyle.text)}>
            {project.title.slice(0, 2)}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className={cn("rounded-full px-3 py-1 text-sm font-medium", catStyle.bg, catStyle.text)}>
            {catLabel}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {project.date}
          </span>
        </div>

        <h1 className="mb-4 text-3xl font-bold text-foreground">{project.title}</h1>
        <p className="mb-6 text-lg text-muted-foreground">{project.description}</p>

        {project.techStack.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              技术栈
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-foreground leading-relaxed">{project.content}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Github className="h-4 w-4" />
              查看源码
            </a>
          )}
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              访问项目
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
