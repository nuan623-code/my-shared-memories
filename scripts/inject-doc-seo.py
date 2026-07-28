#!/usr/bin/env python3
# 给 public/ 下的静态 HTML 文档幂等注入分享/SEO 元数据。
# 用法: inject-doc-seo.py <file.html> <url-path> [--type article|website]
#   <url-path> 形如 /ai-daily/2026-07-24.html(用于 og:url 与 canonical 的绝对地址)
# 注入内容(缺什么补什么,已有的不动):
#   - meta description(无则从正文抽前 110 字)
#   - og:title/description/type/url/site_name + og:image(share-card.png,绝对地址)+ twitter 卡
#   - canonical(自身绝对地址)
#   - JSON-LD Article(headline/datePublished(从文件名日期)/image/author)
#   - GA gtag(站点统一 G-3GRX3Y2VQJ,缺则补)
#   - 右上角悬浮「主页」按钮升级为带 16px 站标图(微信聊天卡片抓「页面首图」,
#     这张 1024×1024 的图同时满足尺寸要求;纯 CSS/SVG 页面否则无图可抓)
import html
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

SITE = "https://mingyuyang.com"
GA_ID = "G-3GRX3Y2VQJ"
IMG = f"{SITE}/share-card.png"

PILL = (
    '\n<a id="ms-home-pill" href="/" style="position:fixed;top:12px;right:12px;z-index:99999;'
    "background:rgba(11,31,63,.88);color:#fff;padding:7px 12px;border-radius:999px;font-size:13px;"
    "text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;"
    'box-shadow:0 2px 10px rgba(0,0,0,.18);display:flex;align-items:center;gap:6px">'
    '<img id="ms-home-pill-img" src="/share-card.png" alt="Mingyu\'s Library" '
    'style="width:16px;height:16px;border-radius:4px;display:block">主页</a>'
)

GA = (
    "\n<!-- Google tag (gtag.js) -->\n"
    f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>\n'
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
    f"gtag('js',new Date());gtag('config','{GA_ID}');</script>"
)


def text_excerpt(s: str, limit: int = 110) -> str:
    """取正文摘要。必须先剔除导航/目录/主题切换这类 chrome——否则抓到的是
    「Home Auto Light Dark Contents…」这种按钮文字,对搜索结果毫无意义。"""
    body = re.search(r"<body[\s\S]*", s) or re.search(r"[\s\S]*", s)
    t = body.group(0)
    t = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", t, flags=re.I)
    # 带 doc-chrome / side-toc 标记的块,以及 nav / svg,都不是正文
    t = re.sub(r'<(\w+)[^>]*class="[^"]*(?:doc-chrome|side-toc|toc-)[^"]*"[\s\S]*?</\1>', " ", t, flags=re.I)
    t = re.sub(r"<nav[\s\S]*?</nav>", " ", t, flags=re.I)
    t = re.sub(r"<svg[\s\S]*?</svg>", " ", t, flags=re.I)
    # 优先用作者写的导语
    lede = re.search(r'<p class="(?:lede|lead|sub|desc)"[^>]*>([\s\S]*?)</p>', t, re.I)
    if lede:
        t = lede.group(1)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", html.unescape(t)).strip()
    return (t[:limit] + "…") if len(t) > limit else t


def git_dates(path: str):
    """(首次提交, 最后提交) ISO 日期。未入库的新文件回落到文件 mtime。
    AI 搜索与 Google 都用 datePublished/dateModified 判断内容新鲜度,不能缺。"""

    def run(args):
        try:
            out = subprocess.run(
                ["git", "log", *args, "--format=%aI", "--", path],
                capture_output=True, text=True, timeout=10,
            ).stdout.strip().split("\n")
            return [x for x in out if x]
        except Exception:
            return []

    created = run(["--diff-filter=A"])
    modified = run(["-1"])
    if created and modified:
        return created[-1][:10], modified[0][:10]
    mt = datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc).date().isoformat()
    return mt, mt


def main() -> None:
    path, urlpath = sys.argv[1], sys.argv[2]
    ogtype = "website" if "--type" in sys.argv and "website" in sys.argv else "article"
    s = open(path, encoding="utf-8").read()
    orig = s

    lm = re.search(r'<html[^>]*\blang="([^"]+)"', s, re.I)
    doc_lang = lm.group(1) if lm else "zh-CN"

    m = re.search(r"<title>([\s\S]*?)</title>", s, re.I)
    title = re.sub(r"\s+", " ", m.group(1)).strip() if m else "Mingyu's Library"

    md = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', s, re.I)
    desc = md.group(1) if md else text_excerpt(s)
    absu = SITE + urlpath

    if "<!-- ms-seo -->" not in s:
        day = re.search(r"(\d{4}-\d{2}-\d{2})", urlpath)
        ld = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "inLanguage": doc_lang,
            "mainEntityOfPage": absu,
            "image": IMG,
            "author": {"@type": "Person", "name": "Mingyu Yang", "url": SITE},
            "publisher": {"@type": "Person", "name": "Mingyu Yang"},
        }
        created, modified = git_dates(path)
        # 文件名里的日期最权威(每日栏目),否则用 git 首次提交日
        ld["datePublished"] = day.group(1) if day else created
        ld["dateModified"] = modified
        e = html.escape
        parts = ["\n<!-- ms-seo -->"]
        if not md:
            parts.append(f'<meta name="description" content="{e(desc)}">')
        parts += [
            f'<meta property="og:title" content="{e(title)}">',
            f'<meta property="og:description" content="{e(desc)}">',
            f'<meta property="og:type" content="{ogtype}">',
            f'<meta property="og:url" content="{absu}">',
            '<meta property="og:site_name" content="Mingyu\'s Library">',
            f'<meta property="og:image" content="{IMG}">',
            '<meta property="og:image:width" content="1024">',
            '<meta property="og:image:height" content="1024">',
            '<meta name="twitter:card" content="summary">',
            f'<meta name="twitter:image" content="{IMG}">',
        ]
        if not re.search(r'rel="canonical"', s, re.I):
            parts.append(f'<link rel="canonical" href="{absu}">')
        parts.append(
            '<script type="application/ld+json">'
            + json.dumps(ld, ensure_ascii=False)
            + "</script>"
        )
        s = s.replace("</head>", "\n".join(parts) + "\n</head>", 1)

    if "googletagmanager" not in s:
        s = s.replace("</head>", GA + "\n</head>", 1)

    if "ms-home-pill-img" not in s:
        if 'id="ms-home-pill"' in s:
            s = re.sub(r'<a id="ms-home-pill".*?</a>', lambda _: PILL.strip(), s, count=1, flags=re.S)
        else:
            s = re.sub(r"(<body[^>]*>)", lambda mm: mm.group(1) + PILL, s, count=1)

    if s != orig:
        open(path, "w", encoding="utf-8").write(s)
        print(f"injected: {path}")
    else:
        print(f"ok(no-op): {path}")


main()
