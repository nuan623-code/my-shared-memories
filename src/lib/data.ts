// ============================================================
// 大类 / 小类 分类体系（taxonomy）
// 用于站内筛选、AI 自动分类参考、视觉色彩
// ============================================================

export type CategoryId =
  | "web"
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
    id: "web",
    label: "Web 开发",
    color: "oklch(0.869 0.1066 150.22)",
    description: "网站、小程序与前端实验",
    subcategories: [
      { id: "website", label: "网站项目" },
      { id: "miniprogram", label: "小程序" },
      { id: "frontend-lab", label: "前端实验" },
      { id: "tool", label: "工具" },
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
}

export const projects: Project[] = [
  {
    id: "portfolio-2024",
    title: "个人作品集网站",
    description: "使用 React 和 Tailwind CSS 构建的响应式个人作品集，支持深色模式切换。",
    category: "web",
    subcategory: "website",
    tags: ["前端", "React", "设计"],
    date: "2024-06",
    image: "",
    github: "https://github.com",
    techStack: ["React", "Tailwind CSS", "Vite", "TypeScript"],
    content:
      "这个项目是我为自己搭建的个人作品集网站，采用现代化的前端技术栈。主要特性包括：响应式设计适配各种设备、流畅的页面过渡动画、深色/浅色模式自动切换、SEO 优化。",
  },
  {
    id: "wechat-mini",
    title: "微信小程序工具集",
    description: "为日常办公开发的一套微信小程序工具，包括数据看板、日程管理等功能。",
    category: "web",
    subcategory: "miniprogram",
    tags: ["小程序", "微信", "工具"],
    date: "2024-03",
    image: "",
    techStack: ["微信小程序", "TypeScript", "云开发"],
    content:
      "这是一个面向移动办公场景的微信小程序集合。项目包含数据看板、团队日程管理、文件共享等多个模块。",
  },
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
    id: "ecommerce-page",
    title: "响应式电商页面",
    description: "纯前端实现的电商产品详情页，包含图片画廊、规格选择、购物车交互等功能。",
    category: "web",
    subcategory: "frontend-lab",
    tags: ["前端", "电商", "交互"],
    date: "2024-01",
    image: "",
    techStack: ["HTML", "CSS", "JavaScript"],
    content:
      "一个纯前端技术实现的电商产品详情页面。实现了产品图片放大查看、多规格选择、加入购物车动画等常见电商交互。",
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
    id: "ad-tech-trends-2024",
    title: "广告技术行业2024趋势分析",
    description:
      "回顾过去一年广告技术领域的关键变化，包括隐私沙盒的影响、AI 驱动的广告投放优化、以及新兴渠道的发展趋势。",
    date: "2024-03-15",
    readTime: "8 分钟",
    category: "article",
    subcategory: "industry",
    tags: ["行业分析", "广告技术", "趋势"],
    content:
      "2024 年，广告技术行业经历了深刻的变革。隐私保护政策的收紧促使整个行业重新思考用户数据的收集和使用方式...",
  },
  {
    id: "llm-learning-path",
    title: "从零开始学大模型：我的学习路径",
    description:
      "分享我系统学习大语言模型的完整路径，从基础理论到实践应用，帮助初学者少走弯路。",
    date: "2024-08-20",
    readTime: "12 分钟",
    category: "article",
    subcategory: "learning",
    tags: ["大模型", "学习笔记", "AI"],
    content:
      "大语言模型（LLM）的学习曲线相对陡峭，但只要方法得当，任何有编程基础的人都可以在几个月内建立起扎实的理解...",
  },
  {
    id: "mobile-ad-optimization",
    title: "移动端广告性能优化实践",
    description:
      "总结在移动应用广告场景下的性能优化经验，包括加载速度、渲染性能和用户体验的平衡。",
    date: "2024-01-10",
    readTime: "6 分钟",
    category: "article",
    subcategory: "practice",
    tags: ["性能优化", "移动开发", "广告"],
    content:
      "在移动应用生态中，广告加载性能直接影响用户体验和收入。本文总结了我在多个项目中积累的广告性能优化经验...",
  },
  {
    id: "ai-product-thinking",
    title: "AI在产品中的应用思考",
    description:
      "探讨如何在产品中合理引入 AI 能力，避免为了 AI 而 AI，真正实现用户价值的提升。",
    date: "2024-09-05",
    readTime: "10 分钟",
    category: "article",
    subcategory: "product",
    tags: ["产品设计", "AI应用", "产品思维"],
    content:
      "AI 技术的快速发展让越来越多的产品团队考虑将 AI 能力集成到产品中。但在兴奋之余，我们需要冷静思考：AI 真的能解决用户的问题吗...",
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
