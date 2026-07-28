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
// =============================================================================
import { readFileSync, existsSync, readdirSync } from "node:fs";
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
  { dir: "", prefix: "", category: "ai", subcategory: null, tags: ["AI"] }, // public/ 根
];

function log(m) { process.stdout.write(`  ${m}\n`); }
function die(m) { process.stderr.write(`\x1b[1;31m✘ sync: ${m}\x1b[0m\n`); process.exit(1); }

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
    rows.push({
      slug,
      type: "article",
      title: o.title || cleanTitle(rawTitle) || base,
      summary: o.summary ?? null,
      category: o.category || s.category,
      subcategory: o.subcategory ?? s.subcategory,
      tags: o.tags || s.tags,
      url: urlPath,
      lang: o.lang ?? s.lang ?? "zh",
      // 同一天的中英版本共享 key(= 栏目+日期),前端据此做 hreflang 与语言切换
      i18n_key: o.i18n_key ?? (s.keyPrefix && /(\d{4}-\d{2}-\d{2})/.test(base)
        ? `${s.keyPrefix}-${base.match(/(\d{4}-\d{2}-\d{2})/)[1]}`
        : null),
    });
  }
}
if (!rows.length) { log("没有发现静态文档,跳过。"); process.exit(0); }

// ---- upsert:on_conflict=slug + ignore-duplicates(只新增、不覆盖)--------
const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/resources?on_conflict=slug`;
const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=ignore-duplicates,return=representation",
  },
  body: JSON.stringify(rows),
});
if (!res.ok) die(`Supabase 返回 ${res.status}: ${await res.text()}`);
const inserted = await res.json();

log(`扫描到 ${rows.length} 篇静态文档,新增 ${inserted.length} 篇到资料库。`);
for (const r of inserted) log(`  + ${r.slug}  →  ${r.title}`);
if (!inserted.length) log("(全部已在库中,无需改动。)");
