// ============================================================
// 分类体系（taxonomy）— 用于资源大类与色彩
// ============================================================

export type CategoryId =
  | "game"
  | "ai"
  | "homework"
  | "article"
  | "video"
  | "tool"
  | "file"
  | "note";

export interface Subcategory {
  id: string;
  label: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  description: string;
  subcategories: Subcategory[];
}

export const categories: Category[] = [
  {
    id: "ai",
    label: "AI 学习",
    color: "oklch(0.891 0.0738 62.67)",
    description: "大模型、计算机视觉与学习笔记",
    subcategories: [
      { id: "llm", label: "大模型" },
      { id: "cv", label: "计算机视觉" },
      { id: "notes", label: "学习笔记" },
      { id: "experiment", label: "实验" },
    ],
  },
  {
    id: "article",
    label: "公众号文章",
    color: "oklch(0.847 0.0858 9.09)",
    description: "行业分析、产品思考与技术分享",
    subcategories: [
      { id: "industry", label: "行业分析" },
      { id: "product", label: "产品思考" },
      { id: "practice", label: "技术实践" },
      { id: "learning", label: "学习心得" },
    ],
  },
  {
    id: "game",
    label: "游戏开发",
    color: "oklch(0.815 0.1044 295.79)",
    description: "独立游戏、引擎与编辑器扩展",
    subcategories: [
      { id: "unity", label: "Unity" },
      { id: "indie", label: "独立游戏" },
      { id: "editor-tool", label: "编辑器扩展" },
    ],
  },
  {
    id: "homework",
    label: "课程作业",
    color: "oklch(0.815 0.0819 225.75)",
    description: "课程项目、论文与实验报告",
    subcategories: [
      { id: "course-project", label: "课程项目" },
      { id: "paper", label: "论文" },
    ],
  },
  {
    id: "video",
    label: "视频",
    color: "oklch(0.78 0.12 200)",
    description: "录制的视频教程与分享",
    subcategories: [
      { id: "tutorial", label: "教程" },
      { id: "talk", label: "分享" },
      { id: "vlog", label: "日常" },
    ],
  },
  {
    id: "tool",
    label: "工具收藏",
    color: "oklch(0.82 0.10 160)",
    description: "外链资源、工具与灵感收藏",
    subcategories: [
      { id: "design", label: "设计" },
      { id: "dev", label: "开发" },
      { id: "ai-tool", label: "AI 工具" },
    ],
  },
  {
    id: "file",
    label: "文件资料",
    color: "oklch(0.80 0.09 50)",
    description: "可下载的 PDF、PPT 与模板",
    subcategories: [
      { id: "slide", label: "幻灯片" },
      { id: "doc", label: "文档" },
      { id: "template", label: "模板" },
    ],
  },
  {
    id: "note",
    label: "碎片笔记",
    color: "oklch(0.85 0.07 270)",
    description: "短想法与灵感闪记",
    subcategories: [],
  },
];

export function getCategory(id: string | null | undefined): Category | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}
