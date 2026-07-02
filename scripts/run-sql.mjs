#!/usr/bin/env node
// =============================================================================
// run-sql.mjs — 在用户自己的 Supabase 上执行 SQL 文件(走 Management API)。
//
//   用法:  node scripts/run-sql.mjs supabase/patches/xxx.sql [更多文件...]
//          node scripts/run-sql.mjs --patches   # 按文件名顺序跑 supabase/patches/ 全部(都是幂等的)
//
// 凭证:Supabase 个人访问令牌(sbp_...),只存仓库外 ~/.ms-supabase-token
// (chmod 600,绝不进 git)。生成入口:supabase.com/dashboard/account/tokens。
// 注意:~/.ms-supabase-admin 里的 sb_secret 是 Data API 密钥,跑不了 SQL(401),
// 两个文件别混。
// =============================================================================
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_REF = "mrkcesmmlmuhycdisgsy"; // 用户自己的 Supabase 项目
const TOKEN_PATH = join(homedir(), ".ms-supabase-token");

const log = (m) => console.log(`[run-sql] ${m}`);
const die = (m) => { console.error(`[run-sql] ✗ ${m}`); process.exit(1); };

if (!existsSync(TOKEN_PATH)) {
  die(`缺少 ${TOKEN_PATH}(Supabase 个人访问令牌 sbp_...)。
  生成:supabase.com/dashboard/account/tokens → Generate new token
  保存:printf '%s' 'sbp_你的令牌' > ~/.ms-supabase-token && chmod 600 ~/.ms-supabase-token`);
}
const token = readFileSync(TOKEN_PATH, "utf8").trim();
if (!token.startsWith("sbp_")) die(`${TOKEN_PATH} 内容不是 sbp_ 开头 —— 放错密钥了?(sb_secret 是 Data API 的,跑不了 SQL)`);

let files = process.argv.slice(2);
if (files[0] === "--patches") {
  const dir = join(ROOT, "supabase", "patches");
  files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => join(dir, f));
}
if (!files.length) die("没有指定 SQL 文件。用法见文件头注释。");

for (const f of files) {
  const abs = f.startsWith("/") ? f : join(ROOT, f);
  if (!existsSync(abs)) die(`文件不存在:${abs}`);
  const sql = readFileSync(abs, "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) die(`${f} 执行失败,Supabase 返回 ${res.status}: ${await res.text()}`);
  log(`✓ 已执行 ${f}`);
}
log("全部完成。");
