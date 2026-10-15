// 分享卡(og:image)的 SVG 模板。
//
// 写成 .mjs 而不是 .ts,是为了让两边共用同一份:
//   - Worker 里的 /api/og/articles/$slug 路由(Vite 直接 import)
//   - 发布时把它栅格化成位图的 scripts/generate-og.mjs(Node 直接 import)
// 类型给在同名的 og-card.d.ts 里。
//
// 排版上这份模板要自己做断行,因为 SVG 的 <text> 不会自动折行。中英混排的关键是
// 别按「字符个数」算宽度:一个汉字约占一个字号的宽,一个拉丁字母只占一半左右,
// 按字符数断行会让纯中文标题冲出画布、纯英文标题又断得过早。

// 卡片上那行小字用的中文名。真源是 src/lib/data.ts 的分类表,
// 但那是 .ts,Node 脚本 import 不了,所以这里留一份只含实际在用的几项的副本。
// 对不上时退回原始 id —— 分享图上写个英文 id 不好看,但不会出错。
const LABELS = {
  ai: "AI 学习",
  article: "公众号文章",
  agent: "智能体",
  llm: "大模型",
  engineering: "AI 工程",
  briefing: "每日简报",
  daily: "AI 深度学习",
  "claude-code": "Claude Code",
  notes: "学习笔记",
  industry: "行业分析",
  product: "产品思考",
  practice: "技术实践",
  learning: "学习心得",
};

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 72;
const CONTENT_W = WIDTH - PAD * 2;

/** 一个字符占几个「字号」宽:全角(中日韩、全角标点)按 1,其余按 0.52 估 */
function charWidth(ch) {
  const c = ch.codePointAt(0);
  const fullWidth =
    (c >= 0x1100 && c <= 0x115f) || // 谚文字母
    (c >= 0x2e80 && c <= 0xa4cf) || // 部首扩展 ~ 彝文
    (c >= 0xac00 && c <= 0xd7a3) || // 谚文音节
    (c >= 0xf900 && c <= 0xfaff) || // 兼容汉字
    (c >= 0xfe30 && c <= 0xfe4f) || // 中文标点竖排形式
    (c >= 0xff00 && c <= 0xff60) || // 全角 ASCII、全角标点
    (c >= 0xffe0 && c <= 0xffe6) ||
    (c >= 0x20000 && c <= 0x3fffd); // 扩展区汉字
  return fullWidth ? 1 : 0.52;
}

/** 字符串按字号折算的显示宽度 */
function textWidth(s) {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return w;
}

/**
 * 按显示宽度断行。
 * 拉丁词不拆开(在空格处断),中文可以逐字断 —— 这正是中文排版的习惯。
 * 超出 maxLines 时最后一行用省略号收尾。
 */
function wrapByWidth(text, fontSize, maxLines) {
  const limit = CONTENT_W / fontSize; // 一行能放几个「字号」宽
  const lines = [];
  let cur = "";
  let curW = 0;

  // 先切成「不可再拆的片段」:连续的拉丁/数字算一段,其余逐字
  const chunks = [];
  let latin = "";
  for (const ch of (text ?? "").replace(/\s+/g, " ").trim()) {
    if (/[A-Za-z0-9@#$%&'./:_-]/.test(ch)) {
      latin += ch;
    } else {
      if (latin) {
        chunks.push(latin);
        latin = "";
      }
      chunks.push(ch);
    }
  }
  if (latin) chunks.push(latin);

  for (const chunk of chunks) {
    const w = textWidth(chunk);
    if (curW + w > limit && cur.trim()) {
      lines.push(cur.trim());
      if (lines.length === maxLines) break;
      cur = chunk === " " ? "" : chunk;
      curW = chunk === " " ? 0 : w;
    } else {
      cur += chunk;
      curW += w;
    }
  }
  if (lines.length < maxLines && cur.trim()) lines.push(cur.trim());

  // 还有没放下的内容 → 最后一行收个省略号
  const consumed = lines.join("").length;
  const all = (text ?? "").replace(/\s+/g, " ").trim().replace(/\s/g, "").length;
  if (lines.length === maxLines && consumed < all) {
    let last = lines[maxLines - 1];
    while (textWidth(last + "…") > limit && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}

function escapeXml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

/**
 * 生成一张 1200×630 的分享卡 SVG。
 * @param {{title?: string|null, summary?: string|null, category?: string|null,
 *          subcategory?: string|null, tags?: string[]|null}} data
 */
export function buildOgSvg(data) {
  const title = (data.title || "Mingyu's Library").trim();
  const summary = (data.summary || "").trim();
  const eyebrow =
    [data.category, data.subcategory]
      .filter(Boolean)
      .map((k) => LABELS[k] ?? k)
      .join(" · ") || "Library";

  const TITLE_SIZE = 58;
  const TITLE_LH = 74;
  const SUM_SIZE = 26;
  const SUM_LH = 38;

  const titleLines = wrapByWidth(title, TITLE_SIZE, 3);
  const titleTop = 252;
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE_LH;

  // 标签行固定贴底,摘要只能用标题到标签之间剩下的空间 —— 原版把两者各自写死 y,
  // 标题一长就压在一起。
  const TAGS_Y = 512;
  const summaryTop = titleBottom + 52;
  const roomForSummary = Math.floor((TAGS_Y - 24 - summaryTop) / SUM_LH) + 1;
  const summaryLines =
    summary && roomForSummary > 0
      ? wrapByWidth(summary, SUM_SIZE, Math.min(2, roomForSummary))
      : [];

  const tags = (data.tags ?? []).slice(0, 4);
  // 胶囊宽度按显示宽度算,中文标签才不会被文字撑破
  const pill = (label) => Math.round(textWidth(label) * 22 + 36);

  let tagX = 0;
  const tagPills = tags
    .map((t) => {
      const label = `#${t}`;
      const w = Math.min(320, pill(label));
      const g = `<g transform="translate(${tagX},0)">
        <rect x="0" y="0" width="${w}" height="44" rx="22" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"/>
        <text x="${w / 2}" y="29" font-size="22" fill="#eaf3ff" text-anchor="middle">${escapeXml(label)}</text>
      </g>`;
      tagX += w + 12;
      return tagX <= CONTENT_W ? g : "";
    })
    .filter(Boolean)
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1e3f"/>
      <stop offset="0.5" stop-color="#11315f"/>
      <stop offset="1" stop-color="#1d4f8c"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7ec8e3" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#7ec8e3" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#5b8def" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#5b8def" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1100" cy="40" r="320" fill="url(#glow1)"/>
  <circle cx="80" cy="620" r="300" fill="url(#glow2)"/>
  <g font-family="'PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Microsoft YaHei',Inter,system-ui,sans-serif" fill="#ffffff">
    <g transform="translate(${PAD},90)">
      <circle cx="6" cy="6" r="6" fill="#7ec8e3"/>
      <text x="22" y="12" font-size="22" fill="#8ec5ff" letter-spacing="3">MINGYU&#39;S LIBRARY</text>
    </g>
    <text x="${PAD}" y="180" font-size="24" fill="#cfe4ff" letter-spacing="1.5">${escapeXml(eyebrow)}</text>
    ${titleLines
      .map(
        (l, i) =>
          `<text x="${PAD}" y="${titleTop + i * TITLE_LH}" font-size="${TITLE_SIZE}" font-weight="800" fill="#ffffff">${escapeXml(l)}</text>`,
      )
      .join("\n    ")}
    ${summaryLines
      .map(
        (l, i) =>
          `<text x="${PAD}" y="${summaryTop + i * SUM_LH}" font-size="${SUM_SIZE}" fill="#dbe9ff">${escapeXml(l)}</text>`,
      )
      .join("\n    ")}
    <g transform="translate(${PAD},${TAGS_Y})">
      ${tagPills}
    </g>
    <text x="${WIDTH - PAD}" y="580" font-size="22" fill="#8ec5ff" letter-spacing="3" text-anchor="end">MINGYUYANG.COM</text>
  </g>
</svg>`;
}
