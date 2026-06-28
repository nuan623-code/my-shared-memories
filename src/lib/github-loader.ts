// GitHub 内容加载与映射工具
// 把 remote articles.json 映射到本地数据模型

import type { Article, Project, CategoryId } from "./data";

export const GITHUB_PAGES = "https://nuan623-code.github.io/personal-site";
export const RAW_BASE =
  "https://raw.githubusercontent.com/nuan623-code/personal-site/main";

export interface RawItem {
  title: string;
  short_title: string;
  url: string;
  tag: string;
  type: "article" | "project";
}

function slugFromUrl(url: string): string {
  return url
    .replace(/^\//, "")
    .replace(/\/$/g, "")
    .replace(/\.html$/, "")
    .replace(/\//g, "-");
}

function mapTagToCategory(tag: string): CategoryId {
  switch (tag) {
    case "AI":
      return "ai";
    case "移动广告":
    case "项目":
      return "article";
    default:
      return "article";
  }
}

function mapTagToSubcategory(tag: string, url: string): string {
  if (tag === "AI") {
    if (url.includes("cs146s")) return "notes";
    if (url.includes("llm-guide")) return "llm";
    if (url.includes("llm-deep-dive")) return "llm";
    if (url.includes("deepseek")) return "llm";
    if (url.includes("claude")) return "practice";
    if (url.includes("prompt")) return "notes";
    return "notes";
  }
  if (tag === "移动广告") return "industry";
  if (tag === "项目") return "practice";
  return "";
}

export function rawToArticle(item: RawItem): Article {
  const slug = slugFromUrl(item.url);
  return {
    id: slug,
    title: item.title,
    description: item.short_title,
    date: "",
    readTime: "",
    category: mapTagToCategory(item.tag),
    subcategory: mapTagToSubcategory(item.tag, item.url),
    tags: [item.tag],
    content: "",
    link: `${GITHUB_PAGES}${item.url}`,
  };
}

export function rawToProject(item: RawItem): Project {
  const slug = slugFromUrl(item.url);
  return {
    id: slug,
    title: item.title,
    description: item.short_title,
    category: "article",
    subcategory: "practice",
    tags: [item.tag],
    date: "",
    image: "",
    techStack: [],
    content: "",
    link: `${GITHUB_PAGES}${item.url}`,
  };
}
