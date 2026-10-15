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
//   3) 小课(cc-lessons)专用三档:场景段 → 本课目标 → 本课小标题串联(2026-10-15 加)
//   4) <meta name="description"> —— 兜底,内容像导航条时丢弃
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
const die = (m) => {
  console.error(`[summaries] ✗ ${m}`);
  process.exit(1);
};

// --- 凭证 -------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l
        .slice(l.indexOf("=") + 1)
        .trim()
        .replace(/^["']|["']$/g, ""),
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
/**
 * 小课(public/cc-lessons/)专用抽取。
 *
 * 必须单列一档,因为这个栏目的 <meta name="description"> 是整栏目共用的一句
 * 「每天一课,依据官方文档与 changelog…」—— 49 篇会拿到一模一样的摘要,
 * 比留空更糟(搜索结果里是重复内容,分享图上整栏目长一个样)。
 *
 * 页面有两代结构:
 *   新版(2026-10 起):<h2>场景:…</h2> 后跟一段真导语 —— 直接用。
 *   旧版(编号技巧式):元信息行里有「本课目标:…」;没有就把各条技巧的小标题串起来,
 *                     「本课三条:A;B;C」对这种清单式内容反而比一段散文更说明问题。
 */
/**
 * 这段文字是不是「每篇都一样的栏目说明」。
 * 把它写成摘要等于给整个栏目发同一张名片,对搜索引擎是重复内容,
 * 对读者则什么也没说 —— 宁可留空等人工补。
 */
function looksBoilerplate(t) {
  return (
    /☰|中\s*\/\s*EN/.test(t) ||
    /^AI (深度学习|每日简报)\s*·/.test(t) ||
    /^每日 AI 技术情报简报/.test(t) ||
    /^面向 .{1,20} 的每日 AI 技术情报/.test(t) ||
    /保真原则/.test(t) ||
    /^每天一个主题/.test(t) ||
    /^Claude Code 实战小课/.test(t) ||
    /^📅\s*\d{4}-\d{2}-\d{2}/.test(t)
  );
}

function extractLesson(html) {
  const i = html.indexOf("</h1>");
  const body = i === -1 ? html : html.slice(i);
  const blocks = [...body.matchAll(/<(h2|p)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => ({
    tag: m[1],
    text: tidy(m[2]),
  }));

  // 1) 场景段
  const firstH2 = blocks.findIndex((b) => b.tag === "h2");
  if (firstH2 !== -1 && /^场景/.test(blocks[firstH2].text)) {
    const lede = blocks.slice(firstH2 + 1).find((b) => b.tag === "p" && b.text.length > 20);
    if (lede) return clamp(lede.text);
  }

  // 2) 「本课目标:…」
  const goal = body.match(/本课目标[::]\s*([^。]{6,80}。?)/);
  if (goal) {
    const t = tidy(goal[1]).replace(/。$/, "");
    if (t.length > 6) return clamp(t);
  }

  // 3) 技巧小标题串联。剥掉「1.」「技巧 1:」这类编号前缀,去掉不是技巧的引子段。
  const heads = blocks
    .filter((b) => b.tag === "h2")
    .map((b) =>
      b.text
        // 「技巧 1:」「技巧 2(进阶):」「Tip 3 —」都要剥掉,只留小标题本身
        .replace(/^(?:技巧|Tip|课)\s*\d+\s*(?:[((][^))]*[))])?\s*[::—-]\s*/i, "")
        .replace(/^\d+[.、]\s*/, ""),
    )
    .filter((t) => t.length > 3 && !/^场景/.test(t) && !/^你(肯定|可能|也许|大概)/.test(t));
  if (heads.length >= 2) {
    // 摘要位置有限,最多列三条。条数写实际总数,但超过三条时要说清只列了前三 ——
    // 写「本课五条」却只跟着三条,是在骗读者。
    const word =
      ["", "一", "两", "三", "四", "五", "六", "七", "八"][heads.length] ?? `${heads.length}`;
    const shown = heads.slice(0, 3).join(";");
    return clamp(heads.length <= 3 ? `本课${word}条:${shown}` : `本课${word}条,前三条:${shown}`);
  }
  return null;
}

function extract(html) {
  // 1) 导语段(ai-daily);优先中文那条。
  //    模板换过几版,导语的 class 出现过 lede / dek / lead 三种写法,都认。
  const LEDE = "(?:lede|dek|lead)";
  const lede =
    html.match(
      new RegExp(`<p[^>]*class="[^"]*\\b${LEDE}\\b[^"]*\\bzh\\b[^"]*"[^>]*>([\\s\\S]*?)</p>`),
    ) ?? html.match(new RegExp(`<p[^>]*class="[^"]*\\b${LEDE}\\b[^"]*"[^>]*>([\\s\\S]*?)</p>`));
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

  // 3) 旧模板兜底(2026-10-15 加)。7–8 月那批页面用的是更早的模板,上面两条规则
  //    都认不出来 —— 它们并不是没有导语,只是导语没穿 lede 那件衣服:
  //      a) 双语版深度学习:段落只标 class="zh"/"en",取中文那段;
  //      b) 旧版简报:「今日头条」下的条目没有编号,规则 2 的「带序号」认不到;
  //      c) 旧版深度学习:<h1> 之后紧跟的那个无 class 段落就是导语。
  //    三条都要过一遍样板话过滤,否则会把页眉的栏目说明当成摘要写进去。
  const zh = html.match(/<p[^>]*class="[^"]*\bzh\b[^"]*"[^>]*>([\s\S]*?)<\/p>/);
  if (zh) {
    const t = tidy(zh[1]);
    if (t.length > 20 && !looksBoilerplate(t)) return clamp(t);
  }

  if (head !== -1) {
    const firstPara = html.slice(head).match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (firstPara) {
      const t = tidy(firstPara[1]);
      if (t.length > 20 && !looksBoilerplate(t)) return clamp(`今日头条:${t}`);
    }
  }

  const afterH1 = html.indexOf("</h1>");
  if (afterH1 !== -1) {
    const firstPara = html.slice(afterH1).match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (firstPara) {
      const t = tidy(firstPara[1]);
      if (t.length > 20 && !looksBoilerplate(t)) return clamp(t);
    }
  }

  // 4) meta description 兜底;抓成导航条的(带「☰」或「中 / EN」)丢掉
  const meta = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
  if (meta) {
    const t = tidy(meta[1]);
    // 丢掉两类没信息量的:被抓成导航条的,和所有简报共用的那句样板话
    // 小课那句整栏目共用的描述也拉黑 —— 它会让 49 篇拿到同一段话
    const boilerplate =
      /☰|中\s*\/\s*EN|^AI (深度学习|每日简报)\s*·|^每日 AI 技术情报简报|^Claude Code 实战小课/.test(
        t,
      );
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

const VERBOSE = process.argv.includes("--why-skipped");
const plan = [];
const skipped = { noFile: 0, noExtract: 0 };
for (const r of rows) {
  const file = localFile(r.url);
  if (!file) {
    skipped.noFile += 1;
    if (VERBOSE) log(`  [无文件] ${r.slug} url=${r.url}`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  // 小课的 meta 描述是整栏目共用的,必须走专用抽取;抽不出才落回通用三档
  const summary = (r.url?.startsWith("/cc-lessons/") ? extractLesson(html) : null) ?? extract(html);
  if (!summary) {
    skipped.noExtract += 1;
    if (VERBOSE) log(`  [抽不出] ${r.slug} (${r.subcategory})`);
    continue;
  }
  plan.push({ id: r.id, slug: r.slug, sub: r.subcategory, summary });
}

log(`可补:${plan.length} 条;跳过:无本地文件 ${skipped.noFile}、抽不出 ${skipped.noExtract}`);
const bySub = plan.reduce((m, p) => ((m[p.sub ?? "-"] = (m[p.sub ?? "-"] ?? 0) + 1), m), {});
log(`按栏目:${JSON.stringify(bySub)}`);
const LIST = process.argv.includes("--list");
for (const p of LIST ? plan : plan.slice(0, 6))
  log(`  ${LIST ? "" : "样例 "}${p.slug} → ${p.summary}`);

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
