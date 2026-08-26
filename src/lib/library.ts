// 资源库(/resources)的栏目轴(2026-08-26 重构阶段 2)。
//
// 为什么是 subcategory 而不是 category/type:
//   实测 232 条内容里 type 全部是 "article"(类型筛选 6 个选项 5 个永远空),
//   category 只用到 ai(208)与 article(24),data.ts 里另外 6 个分类零条数据。
//   唯一有区分度的就是 subcategory —— 它正好等于站上真实的内容线。
// 标签轴也一并撤掉:88 个标签里排前三的就是 subcategory 的复制品,
//   留着只会和栏目轴交叉出空结果。
import { categories } from "@/lib/data";
import type { Resource } from "@/lib/resources";
import type { Locale } from "@/lib/i18n";

export type SectionFamily = "longform" | "daily";

export interface LibrarySection {
  /** resources.subcategory 的值 */
  sub: string;
  family: SectionFamily;
}

// 顺序即页面顺序:手写长文在前。
// 每日栏目有自己的 /daily 门厅,放后面免得 163 条日更把 69 篇长文压在下面看不见。
export const LIBRARY_SECTIONS: LibrarySection[] = [
  { sub: "agent", family: "longform" },
  { sub: "engineering", family: "longform" },
  { sub: "llm", family: "longform" },
  { sub: "practice", family: "longform" },
  { sub: "industry", family: "longform" },
  { sub: "claude-code", family: "daily" },
  { sub: "briefing", family: "daily" },
  { sub: "daily", family: "daily" },
];

const SUB_INDEX = new Map(LIBRARY_SECTIONS.map((s, i) => [s.sub, i]));

export function isKnownSection(sub: string | null | undefined): boolean {
  return Boolean(sub) && SUB_INDEX.has(sub as string);
}

/** 栏目名直接复用 data.ts 的分类表,不另建一份免得两处漂移 */
export function subLabel(sub: string, locale: Locale): string {
  for (const c of categories) {
    const hit = c.subcategories.find((s) => s.id === sub);
    if (hit) return locale === "en" ? (hit.labelEn ?? hit.label) : hit.label;
  }
  return sub;
}

/** 栏目色沿用其所属大类的颜色,和首页卡片的色点对得上 */
export function subColor(sub: string): string | undefined {
  for (const c of categories) {
    if (c.subcategories.some((s) => s.id === sub)) return c.color;
  }
  return undefined;
}

/**
 * 同一篇内容的中英两版共享 i18n_key,不去重列表里会并排出现两张一样的卡(实测 41 对)。
 * 成对时留当前界面语言那版;只有单语版本就照原样留着 —— 中文站也看得到纯英文内容。
 */
export function dedupeByLocale(resources: Resource[], locale: Locale): Resource[] {
  const preferred = new Map<string, Resource>();
  for (const r of resources) {
    if (!r.i18n_key) continue;
    const cur = preferred.get(r.i18n_key);
    const isLocale = (r.lang ?? "zh") === locale;
    if (!cur || (isLocale && (cur.lang ?? "zh") !== locale)) preferred.set(r.i18n_key, r);
  }
  return resources.filter((r) => !r.i18n_key || preferred.get(r.i18n_key)?.id === r.id);
}

/** 按栏目分组,组内保持传入顺序(即 published_at 倒序) */
export function groupBySection(
  resources: Resource[],
): Array<{ section: LibrarySection; items: Resource[] }> {
  const buckets = new Map<string, Resource[]>();
  for (const r of resources) {
    const sub = r.subcategory ?? "";
    if (!SUB_INDEX.has(sub)) continue;
    const list = buckets.get(sub);
    if (list) list.push(r);
    else buckets.set(sub, [r]);
  }
  return LIBRARY_SECTIONS.filter((s) => buckets.has(s.sub)).map((section) => ({
    section,
    items: buckets.get(section.sub) ?? [],
  }));
}
