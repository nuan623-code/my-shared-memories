// 首页 Hero 的「这站还活着」数据条(2026-08-26)。
// 全部由 resources 现有数据算出,不新增请求、不改管线。
import { contentDay, isDailyColumn, type Resource } from "@/lib/resources";

export interface SiteStats {
  /** 全站条目总数 */
  total: number;
  /** 手写长文数(不含三个每日栏目) */
  longform: number;
  /** 连更天数:从今天(今天还没更就从昨天)往回数,连续有产出的天数 */
  streak: number;
  /** 最新一天更新了几条 */
  latestCount: number;
  /** 最新一天(YYYY-MM-DD),空库时为 null */
  latestDay: string | null;
}

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
    return { total: 0, longform: 0, streak: 0, latestCount: 0, latestDay: null };
  }

  const days = new Map<string, number>();
  for (const r of resources) {
    const day = contentDay(r);
    days.set(day, (days.get(day) ?? 0) + 1);
  }

  const latestDay = [...days.keys()].sort().pop() ?? null;

  // 连更从【最近一次出刊那天】往回数,不从今天数:
  // 简报常清晨才入库,今天没出刊不等于断更,更不该把数字打成 0。
  // 站真的停更了,旁边的「更新于 X 月 X 日」会照实说,这里不必再罚一次。
  const today = todayKey(now);
  let cursor = days.has(today) ? today : (latestDay ?? today);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  return {
    total: resources.length,
    longform: resources.filter((r) => !isDailyColumn(r)).length,
    streak,
    latestCount: latestDay ? (days.get(latestDay) ?? 0) : 0,
    latestDay,
  };
}
