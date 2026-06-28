import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { projects, categories, getCategory, type CategoryId } from "@/lib/data";
import { ProjectCard } from "@/components/ProjectCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "项目 — Mingyu Yang" },
      { name: "description", content: "Mingyu Yang 的项目作品集，按大类与小类筛选。" },
      { property: "og:title", content: "项目 — Mingyu Yang" },
      { property: "og:description", content: "Mingyu Yang 的项目作品集" },
    ],
  }),
  component: ProjectsPage,
});

type SearchParams = {
  category?: CategoryId | "all";
  sub?: string;
};

function ProjectsPage() {
  const search = useSearch({ from: "/projects/" }) as SearchParams;
  const [activeCategory, setActiveCategory] = useState<CategoryId | "all">(
    search.category ?? "all"
  );
  const [activeSub, setActiveSub] = useState<string>(search.sub ?? "all");

  const availableSubs = useMemo(() => {
    if (activeCategory === "all") return [];
    const cat = getCategory(activeCategory);
    if (!cat) return [];
    const used = new Set(
      projects
        .filter((p) => p.category === activeCategory && p.subcategory)
        .map((p) => p.subcategory as string)
    );
    return cat.subcategories.filter((s) => used.has(s.id));
  }, [activeCategory]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (activeSub !== "all" && p.subcategory !== activeSub) return false;
      return true;
    });
  }, [activeCategory, activeSub]);

  const handleCategory = (id: CategoryId | "all") => {
    setActiveCategory(id);
    setActiveSub("all");
  };

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">项目</h1>
          <p className="mt-2 text-muted-foreground">
            按大类与小类浏览所有项目、视频和实验
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCategory("all")}
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
              onClick={() => handleCategory(cat.id)}
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

        {availableSubs.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2 border-l-2 border-primary/30 pl-3">
            <button
              onClick={() => setActiveSub("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                activeSub === "all"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              )}
            >
              全部小类
            </button>
            {availableSubs.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSub(sub.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  activeSub === sub.id
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground border border-border hover:text-foreground"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {filteredProjects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">该分类下暂无内容</p>
          </div>
        )}
      </div>
    </div>
  );
}
