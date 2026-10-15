// og-card.mjs 的类型声明(实现写成 .mjs 是为了让 Node 脚本和 Worker 共用同一份模板)
export declare function buildOgSvg(data: {
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | null;
}): string;
