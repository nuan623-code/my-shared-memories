#!/usr/bin/env node
// =============================================================================
// sync-static-resources.mjs
// 把 public/ 下的静态 HTML 文档自动同步进 Supabase `resources` 表,
// 这样新加的学习文档不用手动跑 SQL 就能出现在资料库列表里。
//
//   slug 规则:  public/ai-notes/foo.html -> "ai-notes-foo"
//               public/overseas/foo.html -> "overseas-foo"
//               public/foo.html          -> "foo"
//   标题:       scripts/resources.manifest.json 覆盖 > <h1> > <title>
//   去重:       已存在的 slug 一律跳过、永不覆盖(只新增)。
//   排除:       manifest 里给 slug 设 "skip": true → 永不入库
//               (在网页上删掉某篇静态文档后,要在这里加 skip,否则下次部署会被重新插回)。
//
// 写权限来自 service_role key,只从仓库外的 ~/.ms-supabase-admin 读取
// (chmod 600,绝不进 git、绝不打包进网站)。缺这个文件时本步骤直接跳过,
// 不阻断部署。
//
//   --dry-run   只打印「会新增哪些行」,一个字都不写库(改口径前先拿它核对)
//
// 失败一律非零退出 + 发 macOS 通知:2026-10-10 ~ 10-14 的教训是这条链路会偶发
// 断网,错误被 publish.sh 的 `|| warn` 吞掉,静态页天天上线、库里停在 10-05,
// 首页「每日更新」的卖点自证相反,而没有任何一处报警。现在:同一趟内自己重试,
// 写完还要回读对账(库里少一行就报错),publish.sh 则以非零退出收尾。
// =============================================================================
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const ADMIN_KEY_FILE = join(homedir(), ".ms-supabase-admin");

// 扫描这些目录(及其默认分类)。约定:slug = 目录前缀 + 文件名。
// preferTitleTag:该目录的文档 <h1> 常带 emoji/拼接副标题,标题优先取更干净的 <title>。
const SCAN = [
  { dir: "ai-notes", prefix: "ai-notes-", category: "ai", subcategory: "notes", tags: ["AI"] },
  { dir: "overseas", prefix: "overseas-", category: "article", subcategory: "industry", tags: ["移动广告"] },
  { dir: "ai-daily", prefix: "ai-daily-", category: "ai", subcategory: "daily", tags: ["AI 深度学习"], preferTitleTag: true, keyPrefix: "ai-daily" },
  { dir: "ai-briefing", prefix: "ai-briefing-", category: "ai", subcategory: "briefing", tags: ["AI 简报"], preferTitleTag: true, keyPrefix: "ai-briefing" },
  // 英文版每日内容:与中文版共享 i18n_key(= 目录+日期),供 hreflang 互指与语言切换
  { dir: "en/ai-daily", prefix: "en-ai-daily-", category: "ai", subcategory: "daily", tags: ["AI deep dive"], preferTitleTag: true, lang: "en", keyPrefix: "ai-daily" },
  { dir: "en/ai-briefing", prefix: "en-ai-briefing-", category: "ai", subcategory: "briefing", tags: ["AI briefing"], preferTitleTag: true, lang: "en", keyPrefix: "ai-briefing" },
  // Claude Code 小课(2026-10-15):Cowork 每天写一篇 md,部署脚本渲染进 public/cc-lessons/。
  // 标题取 <h1>(= 「第 N 课:…」,<title> 是「小课 · 日期」,区分不开),入库时补回栏目前缀。
  // keyFromBase:i18n_key 取文件名而非日期 —— 小课无英文镜像,且一天两篇时按日期取会撞
  // idx_resources_i18n_key_lang 这个唯一索引(2026-08-04 就是两篇)。
  { dir: "cc-lessons", prefix: "cc-lessons-", category: "ai", subcategory: "claude-code", tags: ["Claude Code"], titlePrefix: "Claude Code 小课 · ", keyPrefix: "cc-lessons", keyFromBase: true },
  // Claude Code 学习站(2026-08-05):课程与 tip 单页入库;index/template 由通用规则+manifest skip 排除。
  // keyFromBase:slug 不含日期,i18n_key 直接取 keyPrefix-文件名,中英两版共享同一 key(供 hreflang 与语言切换)。
  { dir: "claude-code/course", prefix: "claude-code-course-", category: "ai", subcategory: "claude-code", tags: ["Claude Code"], preferTitleTag: true, keyPrefix: "claude-code-course", keyFromBase: true },
  { dir: "claude-code/tips", prefix: "claude-code-tips-", category: "ai", subcategory: "claude-code", tags: ["Claude Code"], preferTitleTag: true, keyPrefix: "claude-code-tips", keyFromBase: true },
  { dir: "en/claude-code/course", prefix: "en-claude-code-course-", category: "ai", subcategory: "claude-code", tags: ["Claude Code"], preferTitleTag: true, lang: "en", keyPrefix: "claude-code-course", keyFromBase: true },
  { dir: "en/claude-code/tips", prefix: "en-claude-code-tips-", category: "ai", subcategory: "claude-code", tags: ["Claude Code"], preferTitleTag: true, lang: "en", keyPrefix: "claude-code-tips", keyFromBase: true },
  { dir: "", prefix: "", category: "ai", subcategory: null, tags: ["AI"] }, // public/ 根
];

const DRY_RUN = process.argv.includes("--dry-run");

function log(m) { process.stdout.write(`  ${m}\n`); }
// 发一条 macOS 通知。日更是 launchd 在后台跑的,日志没人天天看,所以失败必须主动找人
// (部署包装脚本 ~/.ms-ai-daily-deploy.sh 的状态点名用的也是这个渠道)。
function notify(body) {
  if (process.platform !== "darwin") return;
  try {
    const esc = (t) => t.replace(/[\\"]/g, "\\$&").slice(0, 300);
    spawnSync("osascript", ["-e", `display notification "${esc(body)}" with title "资料库同步失败"`], { stdio: "ignore" });
  } catch { /* 通知发不出去不能反过来弄挂同步 */ }
}
function die(m) {
  process.stderr.write(`\x1b[1;31m✘ sync: ${m}\x1b[0m\n`);
  notify(m);
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 凭证 ----------------------------------------------------------------
if (!existsSync(ADMIN_KEY_FILE)) {
  process.stdout.write(
    `\x1b[1;33m⚠ 跳过文章同步:未找到 ${ADMIN_KEY_FILE}\x1b[0m\n` +
    `  要开启自动同步,把 Supabase service_role key 存进该文件:\n` +
    `    (Supabase 后台 → Settings → API → service_role secret)\n` +
    `    printf '%s' '你的_service_role_key' > ~/.ms-supabase-admin && chmod 600 ~/.ms-supabase-admin\n`
  );
  process.exit(0);
}
const SERVICE_KEY = readFileSync(ADMIN_KEY_FILE, "utf8").trim();
if (!SERVICE_KEY) die(`${ADMIN_KEY_FILE} 是空的`);

// ---- Supabase URL(从 .env 读)-------------------------------------------
function readEnv(name) {
  const f = join(ROOT, ".env");
  if (!existsSync(f)) return null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}
const SUPABASE_URL = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
if (!SUPABASE_URL) die("在 .env 里找不到 SUPABASE_URL(构建前应已从备份还原 .env)");

// ---- 可选的元数据覆盖 manifest -------------------------------------------
let manifest = {};
const manifestPath = join(ROOT, "scripts", "resources.manifest.json");
if (existsSync(manifestPath)) {
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); }
  catch (e) { die(`resources.manifest.json 解析失败:${e.message}`); }
}

// ---- 从 HTML 抽标题 ------------------------------------------------------
// <title> 里的 & 必须写成 &amp;,直接入库会在页面上显示成字面的「&amp;」,所以要还原。
function unescapeEntities(s) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => named[n]);
}
function pick(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  return unescapeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() || null;
}
// 去掉生成器常拼在标题尾部的装饰(如「— 深度学习文档 · 2026-07-12」):先剥尾部日期,再剥「深度学习(文档)」
function cleanTitle(t) {
  if (!t) return null;
  return t
    .replace(/\s*[·|—–-]?\s*\d{4}-\d{2}-\d{2}\s*$/, "")
    .replace(/\s*[·|—–-]?\s*深度学习(文档)?\s*$/, "")
    .replace(/\s*[·|—–-]?\s*Claude Code 学习站\s*$/, "")
    .replace(/\s*[·|—–-]?\s*Claude Code Learning Hub\s*$/, "")
    .trim() || null;
}

// ---- 收集本地静态文档 ----------------------------------------------------
const rows = [];
for (const s of SCAN) {
  const abs = s.dir ? join(PUBLIC, s.dir) : PUBLIC;
  if (!existsSync(abs)) continue;
  for (const name of readdirSync(abs)) {
    if (!name.endsWith(".html")) continue;
    if (name === "index.html") continue; // 目录自带的归档/索引页,不是文档
    const base = name.replace(/\.html$/, "");
    const slug = s.prefix + base;
    const o = manifest[slug] || {};
    if (o.skip) continue;
    const urlPath = "/" + (s.dir ? `${s.dir}/` : "") + name;
    const html = readFileSync(join(abs, name), "utf8");
    if (html.includes("ms-redirect-stub")) continue; // 旧地址占位跳转页,不是文档
    const rawTitle = s.preferTitleTag
      ? pick(html, "title") || pick(html, "h1")
      : pick(html, "h1") || pick(html, "title");
    const baseDate = (base.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    const autoTitle = cleanTitle(rawTitle) || base;
    rows.push({
      slug,
      type: "article",
      title: o.title || (s.titlePrefix ? s.titlePrefix + autoTitle : autoTitle),
      summary: o.summary ?? null,
      category: o.category || s.category,
      subcategory: o.subcategory ?? s.subcategory,
      tags: o.tags || s.tags,
      url: urlPath,
      lang: o.lang ?? s.lang ?? "zh",
      // 日期型栏目按文件名里的真实日期入库,避免补发/回填的往期全部排到「今天」。
      ...(baseDate ? { published_at: `${baseDate}T08:00:00+08:00` } : {}),
      // 中英版本共享 key,前端据此做 hreflang 与语言切换:
      // 日期型栏目(ai-daily 等)= 栏目+日期;keyFromBase 型(claude-code)= 栏目+文件名。
      i18n_key: o.i18n_key ?? (s.keyFromBase && s.keyPrefix
        ? `${s.keyPrefix}-${base}`
        : s.keyPrefix && baseDate
          ? `${s.keyPrefix}-${baseDate}`
          : null),
    });
  }
}
if (!rows.length) { log("没有发现静态文档,跳过。"); process.exit(0); }

// ---- 请求:带重试(这条链路实测会偶发断网)-------------------------------
// 本机 → supabase.co 偶发 ECONNRESET / getaddrinfo ENOTFOUND / connect & headers
// timeout。单次失败就放弃的话,这一天的内容就永远留在 public/ 里不入库(除非哪天
// 又碰巧成功一次),所以同一趟内先自己重试 3 次。
const REST = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1`;
const AUTH = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function request(url, init, what) {
  let last = "未知错误";
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500) return res;              // 4xx 是口径问题,重试也没用
      last = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e) {
      last = e.cause?.message || e.message;
    }
    if (i < 3) { log(`${what}失败(${last}),${i * 3}s 后重试…`); await sleep(i * 3000); }
  }
  die(`${what}连续 3 次失败:${last}`);
}

// 库里已有的 slug 全集(翻页读完;slug 是 on_conflict 键,比对它就够了)
async function fetchDbSlugs() {
  const out = new Set();
  for (let offset = 0; ; offset += 1000) {
    const res = await request(
      `${REST}/resources?select=slug&limit=1000&offset=${offset}`,
      { headers: AUTH },
      "读取库内 slug",
    );
    if (!res.ok) die(`读取库内 slug 返回 ${res.status}: ${await res.text()}`);
    const page = await res.json();
    for (const r of page) out.add(r.slug);
    if (page.length < 1000) return out;
  }
}

const before = await fetchDbSlugs();
const missing = rows.filter((r) => !before.has(r.slug));

if (DRY_RUN) {
  log(`扫描到 ${rows.length} 篇静态文档,库里已有 ${rows.length - missing.length} 篇,将新增 ${missing.length} 篇:`);
  for (const r of missing) {
    log(`  + ${r.slug}`);
    log(`      ${JSON.stringify(r)}`);
  }
  if (!missing.length) log("(全部已在库中,无需改动。)");
  log("--dry-run:没有写库。");
  process.exit(0);
}

// ---- upsert:on_conflict=slug + ignore-duplicates(只新增、不覆盖)--------
// PostgREST 的批量插入要求同一请求里所有对象的键集完全一致(否则 400 PGRST102),
// 而日期型栏目的行多带一个 published_at。所以按键集分组、分批插,别把 published_at
// 对无日期文档补成 null —— 那会覆盖掉 DB 默认值,列表排序就乱了。
const endpoint = `${REST}/resources?on_conflict=slug`;
const groups = new Map();
for (const r of rows) {
  const sig = Object.keys(r).sort().join(",");
  if (!groups.has(sig)) groups.set(sig, []);
  groups.get(sig).push(r);
}
const inserted = [];
for (const batch of groups.values()) {
  const res = await request(endpoint, {
    method: "POST",
    headers: {
      ...AUTH,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify(batch),
  }, "写入资料库");
  if (!res.ok) die(`Supabase 返回 ${res.status}: ${await res.text()}`);
  inserted.push(...(await res.json()));
}

log(`扫描到 ${rows.length} 篇静态文档(${groups.size} 批),新增 ${inserted.length} 篇到资料库。`);
for (const r of inserted) log(`  + ${r.slug}  →  ${r.title}`);
if (!inserted.length) log("(全部已在库中,无需改动。)");

// ---- 回读对账:库里必须一篇不少 ------------------------------------------
// 「写请求成功」不等于「东西进去了」:ignore-duplicates 会静静吞掉唯一索引冲突
// (小课 2026-08-04 两篇撞 idx_resources_i18n_key_lang 就是这么丢的),分批里只要
// 有一批没发出去也一样。所以写完回读一遍,少一篇就报错 + 发通知,别等首页露馅。
const after = await fetchDbSlugs();
const stillMissing = rows.filter((r) => !after.has(r.slug)).map((r) => r.slug);
if (stillMissing.length) {
  for (const slug of stillMissing) log(`  ! 未入库:${slug}`);
  die(`对账不过:${stillMissing.length} 篇静态文档不在 resources 表里` +
      `(最早一篇 ${stillMissing[0]})。静态页已上线、库里没有 —— 站内列表与首页「最近更新」会漏掉它们。`);
}
log(`对账通过:${rows.length} 篇静态文档都在库里。`);
