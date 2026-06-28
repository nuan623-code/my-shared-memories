// ============================================================
// 大类 / 小类 分类体系（taxonomy）
// 用于站内筛选、AI 自动分类参考、视觉色彩
// ============================================================

export type CategoryId =
  | "game"
  | "ai"
  | "homework"
  | "article"
  | "video";

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
];

export function getCategory(id: CategoryId | string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getSubcategoryLabel(
  catId: CategoryId | string,
  subId?: string
): string | undefined {
  if (!subId) return undefined;
  return getCategory(catId)?.subcategories.find((s) => s.id === subId)?.label;
}

// ============================================================
// 内容数据：项目（含视频） & 文章
// ============================================================

export type MediaType = "project" | "video" | "article";

export interface Project {
  id: string;
  title: string;
  description: string;
  /** 大类 */
  category: CategoryId;
  /** 小类（可选） */
  subcategory?: string;
  tags: string[];
  date: string;
  image: string;
  link?: string;
  github?: string;
  techStack: string[];
  content: string;
  /** 媒介类型，默认为 project */
  mediaType?: MediaType;
  /** 视频直链（上传到 Cloud 存储后填入） */
  videoUrl?: string;
  /** 视频外链嵌入 URL（如 B 站、YouTube 的 embed 链接） */
  videoEmbedUrl?: string;
  /** 视频时长，如 "12:30" */
  duration?: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  /** 大类，文章默认 article */
  category?: CategoryId;
  /** 小类 */
  subcategory?: string;
  tags: string[];
  content: string;
  /** GitHub Pages 等外部链接，iframe 嵌入用 */
  link?: string;
}

export const projects: Project[] = [
  {
    id: "platformer-game",
    title: "2D平台跳跃游戏",
    description: "使用 Unity 开发的 2D 横版平台跳跃游戏，包含关卡设计、角色动画和音效系统。",
    category: "game",
    subcategory: "unity",
    tags: ["Unity", "2D", "游戏设计"],
    date: "2023-11",
    image: "",
    techStack: ["Unity", "C#", "Aseprite"],
    content:
      "这是一款受经典 2D 平台跳跃游戏启发的独立游戏项目。玩家控制角色穿越多个精心设计的关卡，收集道具并击败敌人。",
  },
  {
    id: "ai-image-gen",
    title: "AI图像生成实验",
    description: "基于 Stable Diffusion 的图像生成实验，探索不同提示词和参数对生成结果的影响。",
    category: "ai",
    subcategory: "cv",
    tags: ["Stable Diffusion", "深度学习", "计算机视觉"],
    date: "2024-08",
    image: "",
    techStack: ["Python", "PyTorch", "Stable Diffusion", "Gradio"],
    content:
      "这个项目记录了我在 Stable Diffusion 图像生成方面的实验过程。我系统性地测试了不同提示词结构、采样器、CFG 尺度等参数对生成图像质量的影响。",
  },
  {
    id: "data-viz-hw",
    title: "数据可视化课程作业",
    description: "使用 D3.js 实现的交互式数据可视化项目，展示全球气候变化数据趋势。",
    category: "homework",
    subcategory: "course-project",
    tags: ["D3.js", "数据可视化", "课程"],
    date: "2023-09",
    image: "",
    techStack: ["D3.js", "Python", "Pandas", "HTML/CSS"],
    content:
      "这是我在数据可视化课程中的期末项目。项目使用 D3.js 创建了一系列交互式图表，展示过去 50 年全球气温变化趋势。",
  },
  {
    id: "llm-finetune",
    title: "LLM微调学习笔记",
    description: "记录大语言模型微调过程中的实践心得，涵盖 LoRA、QLoRA 等微调方法。",
    category: "ai",
    subcategory: "llm",
    tags: ["LLM", "LoRA", "大模型"],
    date: "2024-10",
    image: "",
    techStack: ["Python", "Transformers", "PEFT", "PyTorch"],
    content:
      "这个项目以学习笔记的形式，记录了我在大语言模型微调方面的实践过程。从最初的理论学习，到使用 LoRA 进行参数高效微调，再到 QLoRA 在消费级显卡上的部署。",
  },
  {
    id: "unity-editor-tool",
    title: "Unity场景编辑器插件",
    description: "为 Unity 开发的自定义编辑器工具，简化关卡设计流程，提升开发效率。",
    category: "game",
    subcategory: "editor-tool",
    tags: ["Unity", "编辑器扩展", "工具"],
    date: "2023-07",
    image: "",
    techStack: ["Unity", "C#", "Editor Scripting"],
    content:
      "这是一款为 Unity 编辑器开发的自定义插件，专门用于简化关卡设计工作流。主要功能包括批量对象放置、自动地形对齐、光照预设快速切换等。",
  },
  // ===== 视频示例：外链嵌入 =====
  {
    id: "llm-intro-video",
    title: "大模型入门：从 Transformer 到 LLM",
    description: "面向初学者的入门视频，梳理从 Transformer 到大语言模型的核心脉络。",
    category: "video",
    subcategory: "tutorial",
    mediaType: "video",
    videoEmbedUrl: "https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=1",
    duration: "18:24",
    tags: ["大模型", "教程", "Transformer"],
    date: "2024-11",
    image: "",
    techStack: ["视频"],
    content: "本期视频用 18 分钟梳理大模型的核心脉络：注意力机制、预训练范式、指令微调与 RLHF。",
  },
];

export const articles: Article[] = [
  {
    id: "deepseek-r1-guide",
    title: "DeepSeek-R1：深度求索的推理模型进化之路",
    description: "DeepSeek-R1 模型解读",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "llm",
    tags: ["AI", "大模型", "DeepSeek"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/deepseek-r1-guide.html",
  },
  {
    id: "prompt-engineering-roundtable",
    title: "Anthropic提示工程圆桌会议：Prompt Engineering Roundtable",
    description: "Anthropic 提示工程圆桌",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "notes",
    tags: ["AI", "Prompt Engineering", "Claude"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/prompt-engineering-roundtable.html",
  },
  {
    id: "ai-notes-cs146s-week1",
    title: "CS146S第一周：Introduction to Building and Evaluating Large Language Model Applications",
    description: "CS146S Week1 笔记",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "notes",
    tags: ["AI", "课程", "LLM应用"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/ai-notes/cs146s-week1.html",
  },
  {
    id: "ai-notes-llm-guide",
    title: "大语言模型完全指南：从入门到实战",
    description: "大语言模型完全指南",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "llm",
    tags: ["AI", "大模型", "指南"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/ai-notes/llm-guide.html",
  },
  {
    id: "ai-notes-llm-deep-dive",
    title: "深入理解大语言模型：架构、训练与推理",
    description: "深入理解 LLM",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "llm",
    tags: ["AI", "大模型", "架构"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/ai-notes/llm-deep-dive.html",
  },
  {
    id: "ai-notes-claude-dev-handbook",
    title: "Claude开发者手册：从API到应用开发",
    description: "Claude 开发者手册",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "practice",
    tags: ["AI", "Claude", "API"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/ai-notes/claude-dev-handbook.html",
  },
  {
    id: "ai-notes-claude-arch",
    title: "Claude产品架构解析：从设计到部署",
    description: "Claude 产品架构解析",
    date: "",
    readTime: "",
    category: "ai",
    subcategory: "practice",
    tags: ["AI", "Claude", "产品架构"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/ai-notes/claude-arch.html",
  },
  {
    id: "overseas-oddl-training",
    title: "ODDL内部培训：移动广告归因与数据对接",
    description: "ODDL 培训笔记",
    date: "",
    readTime: "",
    category: "article",
    subcategory: "industry",
    tags: ["移动广告", "ODDL", "归因"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/overseas/oddl-training.html",
  },
  {
    id: "overseas-adjust-data-discrepancy",
    title: "Adjust数据差异排查指南：从日志到归因",
    description: "Adjust 数据排查指南",
    date: "",
    readTime: "",
    category: "article",
    subcategory: "industry",
    tags: ["移动广告", "Adjust", "数据排查"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/overseas/adjust-data-discrepancy.html",
  },
  {
    id: "overseas-adjust-oddl",
    title: "Adjust ODDL：海外广告投放与数据监控",
    description: "Adjust ODDL 海外投放",
    date: "",
    readTime: "",
    category: "article",
    subcategory: "industry",
    tags: ["移动广告", "Adjust", "ODDL"],
    content: "",
    link: "https://nuan623-code.github.io/personal-site/overseas/adjust-oddl.html",
  },
];

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getArticleById(id: string): Article | undefined {
  return articles.find((a) => a.id === id);
}

export function getProjectsByCategory(
  category: CategoryId | "all"
): Project[] {
  if (category === "all") return projects;
  return projects.filter((p) => p.category === category);
}
