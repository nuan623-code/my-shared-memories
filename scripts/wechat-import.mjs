#!/usr/bin/env node
// =============================================================================
// wechat-import.mjs
// 把微信公众号文章「免费直连」抓进 Supabase `resources` 表(type=article)。
// 不依赖 Firecrawl / 任何第三方:直接 fetch mp.weixin.qq.com 文章页(服务端
// 直出的静态 HTML),解析标题 / 正文 / 封面 / 发布时间,处理图片防盗链,
// 生成与 /admin 导入一致的整页 HTML,写进资料库。
//
//   用法:
//     node scripts/wechat-import.mjs <url> [<url> ...]
//     node scripts/wechat-import.mjs -f scripts/wechat-urls.txt   # 一行一个 URL
//     node scripts/wechat-import.mjs --dry -f scripts/wechat-urls.txt  # 只解析不写库
//
//   slug 规则:  slugify(标题) —— 与 src 里的 slugifyExternal 完全一致。
//   去重:       on_conflict=slug + ignore-duplicates(已存在的一律跳过、绝不覆盖)。
//   渲染:       content 存整页 HTML,文章页用 <iframe srcDoc> 渲染,故图片加
//               referrerpolicy="no-referrer" 让微信 CDN 在无 Referer 时正常返图。
//
// 写权限来自 service_role key,只从仓库外 ~/.ms-supabase-admin 读(chmod 600,
// 绝不进 git)。缺该文件直接报错退出。
// =============================================================================
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_KEY_FILE = join(homedir(), ".ms-supabase-admin");

const C = { r: "\x1b[1;31m", g: "\x1b[1;32m", y: "\x1b[1;33m", d: "\x1b[2m", x: "\x1b[0m" };
function log(m) { process.stdout.write(`  ${m}\n`); }
function die(m) { process.stderr.write(`${C.r}✘ wechat-import: ${m}${C.x}\n`); process.exit(1); }

// ---- 解析参数 -------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
let urls = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry") continue;
  if (a === "-f" || a === "--file") {
    const f = argv[++i];
    if (!f || !existsSync(f)) die(`找不到 URL 列表文件:${f}`);
    urls.push(...readFileSync(f, "utf8").split("\n"));
  } else {
    urls.push(a);
  }
}
urls = urls
  .map((u) => u.trim())
  .filter((u) => /^https?:\/\//i.test(u));
// 去重,保序
urls = [...new Set(urls)];
if (!urls.length) {
  die("没有可导入的 URL。用法:node scripts/wechat-import.mjs <url> ...  或  -f 列表文件");
}

// ---- 凭证 & Supabase URL(dry 模式下不需要)-------------------------------
let SERVICE_KEY = null;
let SUPABASE_URL = null;
if (!DRY) {
  if (!existsSync(ADMIN_KEY_FILE)) {
    die(
      `未找到 ${ADMIN_KEY_FILE}\n` +
      `  把 Supabase service_role key 存进去(Supabase 后台 → Settings → API → service_role secret):\n` +
      `    printf '%s' '你的_service_role_key' > ~/.ms-supabase-admin && chmod 600 ~/.ms-supabase-admin`
    );
  }
  SERVICE_KEY = readFileSync(ADMIN_KEY_FILE, "utf8").trim();
  if (!SERVICE_KEY) die(`${ADMIN_KEY_FILE} 是空的`);
  SUPABASE_URL = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  if (!SUPABASE_URL) die("在 .env 里找不到 SUPABASE_URL(构建前应已从备份还原 .env)");
}

function readEnv(name) {
  const f = join(ROOT, ".env");
  if (!existsSync(f)) return null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

// ---- 与 src/routes/_authenticated/admin.tsx 的 slugify 完全一致 -----------
function slugify(s) {
  return (
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9一-龥]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `wechat-${Date.now()}`
  );
}

// ---- HTML 小工具 ----------------------------------------------------------
function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x?([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, /^x/i.test(code) ? 16 : 10)),
    );
}

function meta(html, key) {
  // <meta property="og:title" content="..."> 或 content 在前
  let m = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
  );
  if (m) return decodeEntities(m[1]);
  m = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i"),
  );
  return m ? decodeEntities(m[1]) : null;
}

function jsVar(html, name) {
  // 匹配 var xxx = "..." / 'xxx' 形式(微信页里大量元数据靠内联 JS)
  const m = html.match(new RegExp(`var\\s+${name}\\s*=\\s*["']([^"']*)["']`));
  return m ? decodeEntities(m[1]) : null;
}

// 从 id="js_content" 起,按 <div>/</div> 配平抽出正文内层 HTML
function extractContent(html) {
  const start = html.match(/id=["']js_content["'][^>]*>/i);
  if (!start) return null;
  const from = start.index + start[0].length;
  const re = /<\/?div\b[^>]*?>/gi;
  re.lastIndex = from;
  let depth = 1;
  let m;
  let end = html.length;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (tag.startsWith("</")) {
      depth--;
      if (depth === 0) { end = m.index; break; }
    } else if (!/\/>$/.test(tag)) {
      depth++;
    }
  }
  return html.slice(from, end);
}

// 微信图片懒加载:src 是占位,真链在 data-src；并加 no-referrer 绕过防盗链。
function normalizeImages(body) {
  return body.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    let a = attrs;
    const dataSrc = a.match(/\bdata-src=["']([^"']+)["']/i);
    if (dataSrc) {
      if (/\bsrc=/i.test(a)) a = a.replace(/\bsrc=["'][^"']*["']/i, `src="${dataSrc[1]}"`);
      else a = `${a} src="${dataSrc[1]}"`;
    }
    // 有些图用 data-croporisrc 作原图
    const crop = a.match(/\bdata-croporisrc=["']([^"']+)["']/i);
    if (crop && !/\bsrc=/i.test(a)) a = `${a} src="${crop[1]}"`;
    if (!/referrerpolicy=/i.test(a)) a = `${a} referrerpolicy="no-referrer"`;
    return `<img${a}>`;
  });
}

function wrapHtml(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${(title || "").replace(/</g, "&lt;")}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif;max-width:760px;margin:0 auto;padding:32px 20px;color:#1a1a1a;line-height:1.8;font-size:16px}
img,video{max-width:100%;height:auto;border-radius:6px}
h1,h2,h3{line-height:1.4;margin-top:1.6em}
p{margin:1em 0}
blockquote{border-left:3px solid #e5e7eb;padding-left:1em;color:#6b7280;margin:1em 0}
pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto}
code{background:#f5f5f5;padding:2px 4px;border-radius:3px;font-size:0.9em}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
</style></head><body>${body}</body></html>`;
}

function parsePublishedAt(html) {
  // 微信页里发布时间通常是内联 JS 的 unix 秒:var ct = "1699999999"
  const ct = html.match(/var\s+ct\s*=\s*["'](\d{10})["']/);
  if (ct) return new Date(parseInt(ct[1], 10) * 1000).toISOString();
  const og = meta(html, "og:release_date") || meta(html, "article:published_time");
  if (og) { const d = new Date(og); if (!isNaN(d.getTime())) return d.toISOString(); }
  // 新版页面:var oriCreateTime = '2024-01-01 12:00'
  const ori = jsVar(html, "oriCreateTime") || jsVar(html, "createTime");
  if (ori) { const d = new Date(ori.replace(/-/g, "/")); if (!isNaN(d.getTime())) return d.toISOString(); }
  return new Date().toISOString();
}

// ---- 抓单篇 ---------------------------------------------------------------
async function fetchArticle(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // 内容被删 / 需验证 的常见文案
  if (/该内容已被发布者删除|此内容因违规无法查看|该公众号已迁移|环境异常|去验证/.test(html) &&
      !/id=["']js_content["']/.test(html)) {
    throw new Error("页面无正文(可能已删除/需验证/被限制)");
  }

  const rawBody = extractContent(html);
  if (!rawBody || rawBody.replace(/<[^>]+>/g, "").trim().length < 10) {
    throw new Error("未抓到正文(js_content 为空)");
  }

  const title =
    meta(html, "og:title") ||
    jsVar(html, "msg_title") ||
    (html.match(/id=["']activity-name["'][^>]*>([\s\S]*?)</i)?.[1] || "").replace(/\s+/g, " ").trim() ||
    "未命名文章";
  const summary =
    meta(html, "og:description") || jsVar(html, "msg_desc") || "";
  const coverUrl =
    meta(html, "og:image") || jsVar(html, "msg_cdn_url") || null;
  const account = meta(html, "og:article:author") || jsVar(html, "nickname") || jsVar(html, "user_name") || "";

  const content = wrapHtml(title, normalizeImages(rawBody));

  return {
    title: title.trim(),
    summary: summary.trim(),
    coverUrl,
    account,
    html: content,
    publishedAt: parsePublishedAt(html),
    sourceUrl: url,
  };
}

// ---- 逐篇抓取 + 收集(带节流,别把微信惹毛)-------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
let ok = 0, fail = 0;

log(`共 ${urls.length} 个 URL,开始抓取${DRY ? "(dry-run,不写库)" : ""}…`);
for (let i = 0; i < urls.length; i++) {
  const u = urls[i];
  const tag = `[${i + 1}/${urls.length}]`;
  try {
    const a = await fetchArticle(u);
    const slug = slugify(a.title);
    rows.push({
      slug,
      type: "article",
      title: a.title,
      summary: a.summary || null,
      content: a.html,
      url: a.sourceUrl,
      cover_url: a.coverUrl,
      tags: ["公众号"],
      category: null,
      subcategory: null,
      owner_id: null,
      published_at: a.publishedAt,
    });
    ok++;
    log(`${C.g}✓${C.x} ${tag} ${a.title}  ${C.d}(${slug}${a.account ? " · " + a.account : ""})${C.x}`);
    if (DRY) {
      const imgCount = (a.html.match(/<img\b/gi) || []).length;
      const textLen = a.html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
      log(`     ${C.d}正文 ${textLen} 字 · 图片 ${imgCount} 张 · 发布 ${a.publishedAt.slice(0, 10)} · 封面 ${a.coverUrl ? "有" : "无"}${C.x}`);
      log(`     ${C.d}摘要:${(a.summary || "(无)").slice(0, 60)}${C.x}`);
    }
  } catch (e) {
    fail++;
    log(`${C.r}✗${C.x} ${tag} ${u}\n     ${C.d}${e.message}${C.x}`);
  }
  if (i < urls.length - 1) await sleep(1200 + Math.random() * 800);
}

if (DRY) {
  log(`\n${C.y}dry-run 结束:成功解析 ${ok} 篇、失败 ${fail} 篇(未写库)。${C.x}`);
  process.exit(fail && !ok ? 1 : 0);
}

if (!rows.length) die(`没有任何文章抓取成功(失败 ${fail} 篇),未写库。`);

// ---- upsert:on_conflict=slug + ignore-duplicates(只新增、绝不覆盖)------
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

log(`\n${C.g}完成${C.x}:抓取成功 ${ok} 篇、失败 ${fail} 篇;新增入库 ${inserted.length} 篇,跳过(已存在)${rows.length - inserted.length} 篇。`);
for (const r of inserted) log(`  + /articles/${r.slug}  →  ${r.title}`);
if (!inserted.length) log("(全部已在库中,无需改动。)");
