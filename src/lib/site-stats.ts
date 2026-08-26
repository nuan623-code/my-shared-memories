// 首页 Hero 的「这站还活着」数据条(2026-08-26)。
// 全部由 resources 现有数据算出,不新增请求、不改管线。
import { contentDay, isDailyColumn, type Resource } from "@/lib/resources";

export interface SiteStats {
  /** 全站条目总数 */
  total: number;
  /** 手写长文数(不含三个每日栏目) */
  longform: number;
  /** 最近 windowDays 天里有产出的天数 */
  activeDays: number;
  /** 上面那个数的统计窗口(天) */
  windowDays: number;
  /** 最新一天更新了几条 */
  latestCount: number;
  /** 最新一天(YYYY-MM-DD),空库时为 null */
  latestDay: string | null;
}

/** 活跃天数的统计窗口 */
const WINDOW_DAYS = 30;

/** 本地时区的 YYYY-MM-DD —— 与 contentDay 同口径比较 */
function todayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeSiteStats(resources: Resource[], now = new Date()): SiteStats {
  if (!resources.length) {
    return {
      total: 0,
      longform: 0,
      activeDays: 0,
      windowDays: WINDOW_DAYS,
      latestCount: 0,
      latestDay: null,
    };
  }

  const days = new Map<string, number>();
  for (const r of resources) {
    const day = contentDay(r);
    days.set(day, (days.get(day) ?? 0) + 1);
  }

  const latestDay = [...days.keys()].sort().pop() ?? null;

  // 口径是「最近 30 天更新了几天」,不是「连更多少天」。
  // 连更太脆:2026-08-25 空了一天,连更就从 8 打回 1,而同期实际更新了 22/30 天 ——
  // 这个数字本来是要说明「这站还活着」,漏一天就归零等于把话讲反。
  const today = todayKey(now);
  let activeDays = 0;
  for (let i = 0; i < WINDOW_DAYS; i += 1) {
    if (days.has(shiftDay(today, -i))) activeDays += 1;
  }

  return {
    total: resources.length,
    longform: resources.filter((r) => !isDailyColumn(r)).length,
    activeDays,
    windowDays: WINDOW_DAYS,
    latestCount: latestDay ? (days.get(latestDay) ?? 0) : 0,
    latestDay,
  };
}
