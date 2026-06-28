export interface Project {
  id: string;
  title: string;
  description: string;
  category: "web" | "game" | "ai" | "homework";
  tags: string[];
  date: string;
  image: string;
  link?: string;
  github?: string;
  techStack: string[];
  content: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  tags: string[];
  content: string;
}

export const categories = [
  { id: "web" as const, label: "Web开发", color: "oklch(0.869 0.1066 150.22)" },
  { id: "game" as const, label: "游戏开发", color: "oklch(0.815 0.1044 295.79)" },
  { id: "ai" as const, label: "AI学习", color: "oklch(0.891 0.0738 62.67)" },
  { id: "homework" as const, label: "课程作业", color: "oklch(0.815 0.0819 225.75)" },
];

export const projects: Project[] = [
  {
    id: "portfolio-2024",
    title: "个人作品集网站",
    description: "使用 React 和 Tailwind CSS 构建的响应式个人作品集，支持深色模式切换。",
    category: "web",
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
    tags: ["Unity", "编辑器扩展", "工具"],
    date: "2023-07",
    image: "",
    techStack: ["Unity", "C#", "Editor Scripting"],
    content:
      "这是一款为 Unity 编辑器开发的自定义插件，专门用于简化关卡设计工作流。主要功能包括批量对象放置、自动地形对齐、光照预设快速切换等。",
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
  category: Project["category"] | "all"
): Project[] {
  if (category === "all") return projects;
  return projects.filter((p) => p.category === category);
}
