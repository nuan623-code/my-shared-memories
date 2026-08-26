#!/usr/bin/env node
// =============================================================================
// backfill-summaries.mjs — 给 resources 表里 summary 为空的条目补摘要(2026-08-26)
//
//   用法:  node scripts/backfill-summaries.mjs          # 干跑,只打印会写什么
//          node scripts/backfill-summaries.mjs --apply  # 真写库
//
// 背景:每日管线入库时不写 summary,于是首页「今日更新」的简报卡只剩一个日期标题,
// RSS 的 <description> 也是空的,看起来像占位符。本脚本【只补 NULL】,不覆盖已有摘要,
// 也不碰管线本身 —— 摘要从各栏目已经生成好的静态 HTML 里抽。
//
// 抽取优先级:
//   1) <p class="lede zh">  —— AI 深度学习(ai-daily)自带的导语
//   2) 「今日头条」下第一条 <strong> 标题 —— AI 每日简报(ai-briefing)
//   3) <meta name="description"> —— 兜底,内容像导航条时丢弃
//
// 凭证:~/.ms-supabase-admin(Data API secret key, sb_secret_...)。
// =============================================================================
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const APPLY = process.argv.includes("--apply");
const MAX_LEN = 150;

const log = (m) => console.log(`[summaries] ${m}`);
const die = (m) => { console.error(`[summaries] ✗ ${m}`); process.exit(1); };

// --- 凭证 -------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
    ]),
);
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) die("`.env` 里没有 SUPABASE_URL");

const ADMIN_PATH = join(homedir(), ".ms-supabase-admin");
const readKey = () => {
  if (!existsSync(ADMIN_PATH)) die(`缺少 ${ADMIN_PATH}(Data API secret key sb_secret_...)`);
  return readFileSync(ADMIN_PATH, "utf8").trim();
};
const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

// --- 文本工具 ---------------------------------------------------------------
const stripTags = (s) => s.replace(/<[^>]+>/g, "");
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
const tidy = (s) => decode(stripTags(s)).replace(/\s+/g, " ").trim();

function clamp(s) {
  if (s.length <= MAX_LEN) return s;
  return `${s.slice(0, MAX_LEN - 1).trimEnd()}…`;
}

// --- 抽取 -------------------------------------------------------------------
function extract(html) {
  // 1) 导语段(ai-daily);优先中文那条。
  //    模板换过几版,导语的 class 出现过 lede / dek / lead 三种写法,都认。
  const LEDE = "(?:lede|dek|lead)";
  const lede =
    html.match(new RegExp(`<p[^>]*class="[^"]*\\b${LEDE}\\b[^"]*\\bzh\\b[^"]*"[^>]*>([\\s\\S]*?)</p>`)) ??
    html.match(new RegExp(`<p[^>]*class="[^"]*\\b${LEDE}\\b[^"]*"[^>]*>([\\s\\S]*?)</p>`));
  if (lede) {
    const t = tidy(lede[1]);
    if (t.length > 12) return clamp(t);
  }

  // 2) 「今日头条」下的第一条标题(ai-briefing)
  const head = html.indexOf("今日头条");
  if (head !== -1) {
    // 头条条目长这样:<p><strong>1. 标题(日期)</strong> 正文…</p>
    // 正文里也有 <strong> 做行内强调,所以只认带序号的那一条,别抓错。
    // 两种写法都出现过:<h3>1. 标题</h3> 和 <p><strong>1. 标题</strong>
    const cands = [
      ...html.slice(head).matchAll(/<(?:h3|strong)[^>]*>([\s\S]*?)<\/(?:h3|strong)>/g),
    ].map((m) => tidy(m[1]));
    const numbered = cands.find((t) => /^\d+[.、]\s*/.test(t));
    if (numbered) {
      const t = numbered.replace(/^\d+[.、]\s*/, "");
      if (t.length > 12) return clamp(`今日头条:${t}`);
    }
  }

  // 3) meta description 兜底;抓成导航条的(带「☰」或「中 / EN」)丢掉
  const meta = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
  if (meta) {
    const t = tidy(meta[1]);
    // 丢掉两类没信息量的:被抓成导航条的,和所有简报共用的那句样板话
    const boilerplate = /☰|中\s*\/\s*EN|^AI (深度学习|每日简报)\s*·|^每日 AI 技术情报简报/.test(t);
    if (!boilerplate && t.length > 12) return clamp(t);
  }

  return null;
}

function localFile(url) {
  if (!url || !url.startsWith("/") || !url.endsWith(".html")) return null;
  const p = join(PUBLIC, url.replace(/^\//, ""));
  return existsSync(p) ? p : null;
}

// --- 主流程 -----------------------------------------------------------------
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/resources?select=id,slug,title,url,summary,subcategory&summary=is.null&order=published_at.desc`,
  { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
);
if (!res.ok) die(`读取失败 ${res.status}: ${await res.text()}`);
const rows = await res.json();
log(`summary 为空的条目:${rows.length}`);

const plan = [];
const skipped = { noFile: 0, noExtract: 0 };
for (const r of rows) {
  const file = localFile(r.url);
  if (!file) { skipped.noFile += 1; continue; }
  const summary = extract(readFileSync(file, "utf8"));
  if (!summary) { skipped.noExtract += 1; continue; }
  plan.push({ id: r.id, slug: r.slug, sub: r.subcategory, summary });
}

log(`可补:${plan.length} 条;跳过:无本地文件 ${skipped.noFile}、抽不出 ${skipped.noExtract}`);
const bySub = plan.reduce((m, p) => ((m[p.sub ?? "-"] = (m[p.sub ?? "-"] ?? 0) + 1), m), {});
log(`按栏目:${JSON.stringify(bySub)}`);
for (const p of plan.slice(0, 6)) log(`  样例 ${p.slug} → ${p.summary}`);

if (!APPLY) {
  log("干跑结束。确认无误后加 --apply 真写库。");
  process.exit(0);
}

const secret = readKey();
let ok = 0;
for (const p of plan) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${p.id}&summary=is.null`, {
    method: "PATCH",
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "content-type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ summary: p.summary }),
  });
  if (!r.ok) die(`写入 ${p.slug} 失败 ${r.status}: ${await r.text()}`);
  ok += 1;
  if (ok % 25 === 0) log(`已写 ${ok}/${plan.length}`);
}
log(`✔ 写入完成:${ok} 条`);
