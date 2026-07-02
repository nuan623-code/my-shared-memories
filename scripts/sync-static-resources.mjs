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
const SCAN = [
  { dir: "ai-notes", prefix: "ai-notes-", category: "ai", subcategory: "notes", tags: ["AI"] },
  { dir: "overseas", prefix: "overseas-", category: "article", subcategory: "industry", tags: ["移动广告"] },
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
function pick(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || null;
}

// ---- 收集本地静态文档 ----------------------------------------------------
const rows = [];
for (const s of SCAN) {
  const abs = s.dir ? join(PUBLIC, s.dir) : PUBLIC;
  if (!existsSync(abs)) continue;
  for (const name of readdirSync(abs)) {
    if (!name.endsWith(".html")) continue;
    const base = name.replace(/\.html$/, "");
    const slug = s.prefix + base;
    const o = manifest[slug] || {};
    if (o.skip) continue;
    const urlPath = "/" + (s.dir ? `${s.dir}/` : "") + name;
    const html = readFileSync(join(abs, name), "utf8");
    rows.push({
      slug,
      type: "article",
      title: o.title || pick(html, "h1") || pick(html, "title") || base,
      summary: o.summary ?? null,
      category: o.category || s.category,
      subcategory: o.subcategory ?? s.subcategory,
      tags: o.tags || s.tags,
      url: urlPath,
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
