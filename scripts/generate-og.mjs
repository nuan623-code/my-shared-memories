#!/usr/bin/env node
// 把每篇文章的分享卡栅格化成 public/og/<slug>.jpg。
//
// 为什么在发布时生成,而不是在 Worker 里按请求生成:
//   Worker 里没有栅格化能力。要在边缘出位图得塞 satori + resvg 的 wasm,
//   中文还得带字体(或每次请求去拉字体子集),既撑 Worker 体积又拖响应。
//   而发布本来就在本机跑,本机有字体、有 rsvg-convert,生成一次用很久。
//
// 产物不入库(.gitignore 里忽略 public/og/),但会随 .output/public 一起部署成静态资源,
// 所以线上一直有;本地删了重跑即可。
//
// 依赖:rsvg-convert(brew install librsvg)、sips(macOS 自带)。
// 缺了就跳过并提示 —— 发布本身不该因为少几张分享图而失败。

import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildOgSvg } from "../src/lib/og-card.mjs";

const run = promisify(execFile);
const OUT_DIR = "public/og";
const FORCE = process.argv.includes("--force");

function env(...names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  return null;
}

async function loadEnv() {
  // 复用 .env 里的 Supabase 配置,不另立一套
  if (!existsSync(".env")) return;
  const text = await (await import("node:fs/promises")).readFile(".env", "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function has(cmd) {
  try {
    await run("command", ["-v", cmd], { shell: true });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await loadEnv();
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.warn("⚠️  缺少 SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY,跳过分享图生成");
    return;
  }
  if (!(await has("rsvg-convert"))) {
    console.warn("⚠️  没找到 rsvg-convert(brew install librsvg),跳过分享图生成");
    return;
  }
  const canJpeg = await has("sips");

  const res = await fetch(
    `${url}/rest/v1/resources?select=slug,title,summary,category,subcategory,tags&type=eq.article&slug=not.is.null&limit=2000`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) {
    console.warn(`⚠️  取文章列表失败(HTTP ${res.status}),跳过分享图生成`);
    return;
  }
  const rows = await res.json();

  await mkdir(OUT_DIR, { recursive: true });
  const existing = new Set(
    (await readdir(OUT_DIR).catch(() => [])).filter(
      (f) => f.endsWith(".jpg") || f.endsWith(".png"),
    ),
  );

  const ext = canJpeg ? "jpg" : "png";
  let made = 0;
  let skipped = 0;

  for (const r of rows) {
    const name = `${r.slug}.${ext}`;
    if (!FORCE && existing.has(name)) {
      skipped += 1;
      continue;
    }
    const svgPath = join(tmpdir(), `og-${process.pid}.svg`);
    const pngPath = join(tmpdir(), `og-${process.pid}.png`);
    await writeFile(svgPath, buildOgSvg(r), "utf8");
    await run("rsvg-convert", ["-w", "1200", "-h", "630", svgPath, "-o", pngPath]);
    if (canJpeg) {
      // 渐变底图的 PNG 要 230KB 上下,转成 JPEG 大约只剩四分之一,社交平台一样认
      await run("sips", [
        "-s",
        "format",
        "jpeg",
        "-s",
        "formatOptions",
        "80",
        pngPath,
        "--out",
        join(OUT_DIR, name),
      ]);
    } else {
      await run("cp", [pngPath, join(OUT_DIR, name)]);
    }
    await rm(svgPath, { force: true });
    await rm(pngPath, { force: true });
    made += 1;
    if (made % 25 === 0) console.log(`  …已生成 ${made} 张`);
  }

  console.log(
    `✅ 分享图:新生成 ${made} 张,沿用已有 ${skipped} 张,共 ${rows.length} 篇(${OUT_DIR}/*.${ext})`,
  );
}

main().catch((e) => {
  console.warn("⚠️  分享图生成出错(不影响发布):", e.message);
});
