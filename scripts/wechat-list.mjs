#!/usr/bin/env node
// =============================================================================
// wechat-list.mjs
// 枚举「你自己订阅号」的全部历史已发文章永久链接,写到 scripts/wechat-urls.txt。
// 走公众号后台的「已发表内容」接口(appmsgpublish),需要你的登录态。
//
// 个人订阅号没有开放 API,但你登录 mp.weixin.qq.com 后,后台自己在用的这个
// 内部接口能分页列出你所有已群发文章。本脚本就是带上你的 cookie+token 去调它。
//
//   一次性准备(登录态):
//     1. 浏览器登录 https://mp.weixin.qq.com
//     2. 地址栏里找到 token=XXXXXX(进「首页」后 URL 就有)
//     3. F12 → Network → 随便点开一个后台请求 → 复制请求头里的整条 Cookie
//     4. 存成会话文件(仓库外、chmod 600):
//          cat > ~/.wechat-mp-session <<'EOF'
//          { "token": "粘贴token", "cookie": "粘贴整条Cookie" }
//          EOF
//          chmod 600 ~/.wechat-mp-session
//
//   运行:
//     node scripts/wechat-list.mjs                # 拉全部,写 scripts/wechat-urls.txt
//     node scripts/wechat-list.mjs --max 20       # 只拉最近 20 篇(试跑)
//
//   然后:
//     node scripts/wechat-import.mjs -f scripts/wechat-urls.txt
//
// 注意:微信有频率控制(freq control)。脚本每页之间会 sleep;若被限流,
// 等几分钟或换个时间再跑。cookie 会过期,过期就重复上面准备步骤刷新。
// =============================================================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SESSION_FILE = join(homedir(), ".wechat-mp-session");
const OUT = join(ROOT, "scripts", "wechat-urls.txt");

const C = { r: "\x1b[1;31m", g: "\x1b[1;32m", y: "\x1b[1;33m", d: "\x1b[2m", x: "\x1b[0m" };
function log(m) { process.stdout.write(`  ${m}\n`); }
function die(m) { process.stderr.write(`${C.r}✘ wechat-list: ${m}${C.x}\n`); process.exit(1); }

const argv = process.argv.slice(2);
const maxArg = argv.indexOf("--max");
const MAX = maxArg >= 0 ? parseInt(argv[maxArg + 1], 10) : Infinity;

// ---- 登录态 ---------------------------------------------------------------
if (!existsSync(SESSION_FILE)) {
  die(
    `未找到 ${SESSION_FILE}。请先按脚本顶部注释准备登录态:\n` +
    `  { "token": "...", "cookie": "..." }  存进 ~/.wechat-mp-session(chmod 600)`,
  );
}
let session;
try { session = JSON.parse(readFileSync(SESSION_FILE, "utf8")); }
catch (e) { die(`${SESSION_FILE} 不是合法 JSON:${e.message}`); }
const { token, cookie } = session;
if (!token || !cookie) die(`${SESSION_FILE} 里缺 token 或 cookie。`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// appmsgpublish 的响应是「多层 JSON 字符串套娃」,逐层稳妥解析。
function safeParse(v) {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return null; }
}

async function fetchPage(begin, count) {
  const params = new URLSearchParams({
    sub: "list",
    search_field: "null",
    begin: String(begin),
    count: String(count),
    query: "",
    fakeid: "",
    type: "101_1",
    free_publish_type: "1",
    sub_action: "list_ex",
    token,
    lang: "zh_CN",
    f: "json",
    ajax: "1",
  });
  const url = `https://mp.weixin.qq.com/cgi-bin/appmsgpublish?${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
      Referer: `https://mp.weixin.qq.com/cgi-bin/appmsgpublish?token=${token}&lang=zh_CN`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const ret = json?.base_resp?.ret;
  if (ret !== 0) {
    const err = json?.base_resp?.err_msg || "unknown";
    if (ret === 200013 || /freq/i.test(err)) throw new Error(`FREQ 频率控制(${err});等几分钟再跑`);
    if (ret === 200003 || /session|invalid/i.test(err)) throw new Error(`登录态失效(${err});刷新 ~/.wechat-mp-session`);
    throw new Error(`接口返回 ret=${ret} ${err}`);
  }
  const page = safeParse(json.publish_page) || {};
  const list = page.publish_list || [];
  const total = page.total_count ?? 0;
  const items = [];
  for (const entry of list) {
    const info = safeParse(entry.publish_info);
    const arr = info?.appmsgex || [];
    for (const a of arr) {
      if (a?.link) items.push({ title: a.title || "", link: a.link });
    }
  }
  return { items, total };
}

// ---- 分页拉全部 -----------------------------------------------------------
const PAGE = 20;
const seen = new Set();
const collected = [];
let begin = 0;
let total = null;

log(`开始拉取已发文章列表${MAX !== Infinity ? `(上限 ${MAX} 篇)` : ""}…`);
while (true) {
  let page;
  try {
    page = await fetchPage(begin, PAGE);
  } catch (e) {
    if (collected.length) { log(`${C.y}⚠ 提前停止:${e.message}${C.x}`); break; }
    die(e.message);
  }
  if (total === null) { total = page.total; log(`后台报告共 ${total} 篇。`); }
  if (!page.items.length) break;

  for (const it of page.items) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    collected.push(it);
    log(`${C.d}·${C.x} ${it.title || "(无标题)"}`);
    if (collected.length >= MAX) break;
  }
  begin += PAGE;
  if (collected.length >= MAX) break;
  if (total !== null && begin >= total) break;
  await sleep(1500 + Math.random() * 1500);
}

if (!collected.length) die("一篇都没拉到(登录态是否有效?账号是否有已群发文章?)");

writeFileSync(OUT, collected.map((c) => c.link).join("\n") + "\n", "utf8");
log(`\n${C.g}完成${C.x}:收集到 ${collected.length} 篇链接 → ${OUT}`);
log(`下一步:${C.d}node scripts/wechat-import.mjs -f scripts/wechat-urls.txt${C.x}`);
