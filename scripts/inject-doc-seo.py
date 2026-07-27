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
import re
import sys

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
    body = re.search(r"<body[\s\S]*", s) or re.search(r"[\s\S]*", s)
    t = body.group(0)
    t = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", html.unescape(t)).strip()
    return (t[:limit] + "…") if len(t) > limit else t


def main() -> None:
    path, urlpath = sys.argv[1], sys.argv[2]
    ogtype = "website" if "--type" in sys.argv and "website" in sys.argv else "article"
    s = open(path, encoding="utf-8").read()
    orig = s

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
            "inLanguage": "zh-CN",
            "mainEntityOfPage": absu,
            "image": IMG,
            "author": {"@type": "Person", "name": "Mingyu Yang", "url": SITE},
            "publisher": {"@type": "Person", "name": "Mingyu Yang"},
        }
        if day:
            ld["datePublished"] = day.group(1)
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
