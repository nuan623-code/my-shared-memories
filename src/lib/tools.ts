import { SUIREAD_APP_STORE_URL } from "@/components/SuiReadPromo";

// 我做的作品/工具(2026-08-08 重构阶段1:从首页 index.tsx 抽出共享)。
// 首页「作品带」取 homeFeatured 为 true 的;/tools 页展示全部。
// 三个每日栏目(简报/深度/Claude Code)不在这里——它们是「栏目」,入口在首页栏目导览与 /daily。
// 这些指向 public/ 下的独立静态页或外链,在 React Router 之外,用 <a> 而非 <Link>。
export interface ToolItem {
  title: string;
  titleEn?: string;
  href: string;
  hrefEn?: string; // 有英文版页面的工具,en 界面下用这个链接
  desc: string;
  descEn?: string;
  tags: string[];
  icon?: string;
  cta?: string;
  gaEvent?: string;
  homeFeatured?: boolean;
}

export const TOOLS: ToolItem[] = [
  {
    title: "随读 SuiRead(iOS App)",
    titleEn: "SuiRead (iOS app)",
    href: SUIREAD_APP_STORE_URL,
    desc: "我做的 HTML 阅读器。把本站文章下载成 HTML 导入,就能离线阅读、高亮标注,进度自动记忆。",
    descEn: "An HTML reader I built. Download any article here, import it, and read offline with highlights and saved progress.",
    tags: ["iOS", "阅读器", "App Store"],
    icon: "/suiread-icon.png",
    cta: "App Store",
    gaEvent: "suiread_home_tool_click",
    homeFeatured: true,
  },
  {
    title: "公众号 Markdown 排版",
    titleEn: "WeChat Markdown formatter",
    href: "/projects/wechat-md/",
    desc: "把 Markdown 一键转成微信公众号可直接粘贴的排版样式，实时预览、多主题，写完即排。",
    descEn: "Turn Markdown into paste-ready WeChat article styling — live preview, multiple themes.",
    tags: ["Markdown", "公众号", "排版"],
    homeFeatured: true,
  },
  {
    title: "Claude Code 学习站",
    titleEn: "Claude Code learning hub",
    href: "/claude-code/",
    hrefEn: "/en/claude-code/",
    desc: "既是每日栏目也是作品:自建的静态学习站,14 课系统课程 + 实战 Tip 库,每日增量更新。",
    descEn: "Both a daily column and a build: a static learning hub with a 14-day course and searchable tips, updated daily.",
    tags: ["Claude Code", "教程", "每日更新"],
    homeFeatured: true,
  },
];
