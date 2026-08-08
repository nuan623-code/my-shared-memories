import type { TKey } from "@/lib/i18n/dict";

// 三个每日栏目的元数据(2026-08-08 重构阶段1)。
// 首页「栏目导览」与 /daily 门厅页共用;归档页是 public/ 下的静态站,用 <a> 直链。
export interface DailyColumn {
  /** resources 表里的 subcategory 值 */
  sub: "briefing" | "daily" | "claude-code";
  titleKey: TKey;
  descKey: TKey;
  archive: string;
  archiveEn?: string;
}

export const DAILY_COLUMNS: DailyColumn[] = [
  { sub: "briefing", titleKey: "col.briefing.title", descKey: "col.briefing.desc", archive: "/ai-briefing/" },
  { sub: "daily", titleKey: "col.daily.title", descKey: "col.daily.desc", archive: "/ai-daily/" },
  { sub: "claude-code", titleKey: "col.cc.title", descKey: "col.cc.desc", archive: "/claude-code/", archiveEn: "/en/claude-code/" },
];
