import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { projects, categories } from "@/lib/data";
import { ProjectCard } from "@/components/ProjectCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "项目 — Mingyu Yang" },
      { name: "description", content: "Mingyu Yang 的项目作品集，涵盖 Web 开发、游戏开发、AI 学习和课程作业。" },
      { property: "og:title", content: "项目 — Mingyu Yang" },
      { property: "og:description", content: "Mingyu Yang 的项目作品集" },
    ],
  }),
  component: ProjectsPage,
});

type SearchParams = {
  category?: "web" | "game" | "ai" | "homework" | "all";
};

function ProjectsPage() {
  const search = useSearch({ from: "/projects/" }) as SearchParams;
  const [activeCategory, setActiveCategory] = useState<SearchParams["category"]>(
    search.category || "all"
  );

  const filteredProjects =
    activeCategory && activeCategory !== "all"
      ? projects.filter((p) => p.category === activeCategory)
      : projects;

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">项目</h1>
          <p className="mt-2 text-muted-foreground">
            记录我在 Web 开发、游戏开发、AI 学习和课程中的实践项目
          </p>
        </div>

        {/* Filter tabs */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all",
              activeCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredProjects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              该分类下暂无项目
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
