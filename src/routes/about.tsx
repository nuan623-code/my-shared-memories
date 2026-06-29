import { createFileRoute } from "@tanstack/react-router";
import {
  Code2,
  Gamepad2,
  Brain,
  FileText,
  Newspaper,
  Mail,
  Github,
  Linkedin,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于 — Mingyu Yang" },
      { name: "description", content: "了解 Mingyu Yang 的背景、经验和兴趣方向。" },
      { property: "og:title", content: "关于 — Mingyu Yang" },
      { property: "og:description", content: "了解 Mingyu Yang 的背景与经验" },
    ],
  }),
  component: AboutPage,
});

const interests = [
  {
    icon: Code2,
    title: "Web开发",
    description: "前端技术探索，从响应式页面到现代 Web 应用",
  },
  {
    icon: Gamepad2,
    title: "游戏开发",
    description: "Unity 与独立游戏创作，探索交互设计的乐趣",
  },
  {
    icon: Brain,
    title: "AI学习",
    description: "大语言模型、图像生成与 AI 产品化实践",
  },
  {
    icon: FileText,
    title: "数据分析",
    description: "数据可视化与广告技术中的数据驱动决策",
  },
  {
    icon: Newspaper,
    title: "内容创作",
    description: "公众号文章，分享行业观察与技术心得",
  },
];

function AboutPage() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Profile */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
            <span className="text-3xl font-bold text-primary">MY</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mingyu Yang</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            广告技术解决方案负责人
          </p>
        </div>

        {/* Bio */}
        <div className="mb-12 rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-4 text-xl font-semibold text-foreground">简介</h2>
          <p className="leading-relaxed text-muted-foreground">
            拥有 10 余年移动互联网行业经验，现任广告技术解决方案负责人。
            关注 AI 技术发展、软件开发实践、数据分析方法与产品管理。
            业余时间热爱探索新技术，从 Web 开发到游戏制作，从大模型学习到独立内容创作。
            相信持续学习和记录是成长的最好方式。
          </p>
        </div>

        {/* Interests */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-foreground">兴趣方向</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {interests.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-4 text-xl font-semibold text-foreground">联系方式</h2>
          <p className="mb-6 text-muted-foreground">
            欢迎就技术话题、行业讨论或合作机会与我联系。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:nuan623@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Mail className="h-4 w-4" />
              邮箱
            </a>
            <a
              href="https://github.com/nuan623-code"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/mingyu-yang-7048389b/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
