#!/usr/bin/env python3
# 把 AI 每日简报的 Markdown 渲染成站内风格的自包含 HTML。
# 用法: render-briefing.py <src.md> <dest.html> <YYYY-MM-DD>
# stdout 输出当天头条标题(供归档列表用);无头条时输出「AI 技术情报简报」。
import re
import sys

import markdown

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{page_title}</title>
<meta name="description" content="每日 AI 技术情报简报:主流厂商官方发布、Agent 工程、学术与行业动态。">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GRX3Y2VQJ"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){{dataLayer.push(arguments);}}
gtag('js', new Date());
gtag('config', 'G-3GRX3Y2VQJ');
</script>
<style>
:root{{--bg:#f4f8fd;--card:#fff;--ink:#1a2b47;--ink-soft:#43516b;--line:#dce6f2;--accent:#1a63ff;--accent-soft:#e8f0ff;--hero1:#0b1f3f;--hero2:#123a7a}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB",sans-serif;font-size:16.5px;line-height:1.85}}
.hero{{background:linear-gradient(135deg,var(--hero1),var(--hero2));color:#fff;padding:46px 0 38px}}
.wrap{{max-width:860px;margin:0 auto;padding:0 22px}}
.hero h1{{margin:0 0 8px;font-size:26px;font-weight:800;line-height:1.35}}
.hero .date{{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);padding:3px 12px;border-radius:999px;font-size:13px;color:#c9dbf5}}
main{{padding:30px 0 60px}}
.content{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px 32px;box-shadow:0 2px 14px rgba(20,50,110,.06)}}
.content h2{{font-size:21px;margin:34px 0 12px;padding-bottom:8px;border-bottom:2px solid var(--accent-soft);font-weight:800}}
.content h2:first-child{{margin-top:0}}
.content h3{{font-size:17.5px;margin:24px 0 8px;font-weight:700}}
.content p{{margin:12px 0}}
.content ul,.content ol{{margin:12px 0;padding-left:24px}}
.content li{{margin:8px 0}}
.content a{{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(26,99,255,.25)}}
.content a:hover{{border-bottom-color:var(--accent)}}
.content blockquote{{margin:14px 0;padding:10px 18px;border-left:4px solid var(--accent);background:var(--accent-soft);border-radius:0 10px 10px 0;color:var(--ink-soft);font-size:15px}}
.content blockquote p{{margin:4px 0}}
.content hr{{border:none;border-top:1px solid var(--line);margin:26px 0}}
.content code{{background:var(--accent-soft);padding:1px 6px;border-radius:6px;font-size:14px}}
.content pre{{background:#0b1f3f;color:#dbe8fb;padding:16px;border-radius:10px;overflow-x:auto;font-size:14px}}
.content pre code{{background:none;padding:0;color:inherit}}
.content table{{border-collapse:collapse;width:100%;margin:14px 0;font-size:14.5px}}
.content th,.content td{{padding:9px 12px;border:1px solid var(--line);text-align:left;vertical-align:top}}
.content thead th{{background:#eef4fd}}
.content img{{max-width:100%}}
footer{{color:var(--ink-soft);font-size:13px;text-align:center;padding:26px 0 44px}}
footer a{{color:var(--accent);text-decoration:none}}
@media(max-width:640px){{.hero h1{{font-size:21px}}.content{{padding:20px 18px}}body{{font-size:16px}}}}
</style>
</head>
<body>
<a id="ms-home-pill" href="/" style="position:fixed;top:12px;right:12px;z-index:99999;background:rgba(11,31,63,.88);color:#fff;padding:7px 14px;border-radius:999px;font-size:13px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.18)">← 主页</a>
<header class="hero"><div class="wrap">
  <span class="date">{cn_date}</span>
  <h1>{title}</h1>
</div></header>
<main class="wrap">
  <div class="content">
{body}
  </div>
</main>
<footer class="wrap"><a href="/ai-briefing/">← 往期简报归档</a> · <a href="/">返回 Mingyu's Library</a></footer>
</body>
</html>
"""


def main() -> None:
    src, dest, day = sys.argv[1], sys.argv[2], sys.argv[3]
    md = open(src, encoding="utf-8").read()

    m = re.match(r"\s*#\s+(.+)\n", md)
    title = m.group(1).strip() if m else f"AI 每日技术情报简报 · {day}"
    if m:
        md = md[m.end():]

    # 头条两种历史格式:新版「**1. 标题**」/ 旧版「1. **标题**」
    headline_m = re.search(r"\*\*\s*1\.\s*(.+?)\s*\*\*", md) or re.search(
        r"^\s*1\.\s+\*\*(.+?)\*\*", md, re.M
    )
    headline = headline_m.group(1).strip() if headline_m else "AI 技术情报简报"
    if len(headline) > 48:
        headline = headline[:47] + "…"

    body = markdown.markdown(md, extensions=["extra", "sane_lists"])
    body = body.replace('<a href="http', '<a target="_blank" rel="noopener" href="http')

    y, mo, d = day.split("-")
    cn_date = f"{y}年{int(mo)}月{int(d)}日"
    html = TEMPLATE.format(
        page_title=f"AI 每日简报 · {cn_date}",
        title=title,
        cn_date=cn_date,
        body=body,
    )
    open(dest, "w", encoding="utf-8").write(html)
    print(headline)


main()
