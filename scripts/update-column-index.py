#!/usr/bin/env python3
# 维护每日栏目归档页的条目列表(ai-daily / ai-briefing / cc-lessons 共用)。
# 用法: update-column-index.py <index.html> <href> <YYYY-MM-DD> <列表文字> [--dedup=date|href]
# 行为:插入该条 → 按日期倒序重排 → 去重(已有条目优先,补发往期落到正确位置)。
# --dedup=date(默认):一天一条,同一天的新条目不覆盖已有条目。ai-daily / ai-briefing 用这档,
#   因为它们的文件名带会变的 slug,按日期去重才不会一天攒出两行。
# --dedup=href:按链接去重,允许一天多条(cc-lessons 用这档,小课有一天两篇的情况;
#   它的文件名是日期+序号,稳定可重算,不会因重跑而重复)。
# 2026-10-15 从 ~/.ms-ai-daily-deploy.sh 的内联 heredoc 抽出来,部署脚本与回填脚本共用同一份实现。
import re
import sys

START, END = "<!-- AI-DAILY-LIST-START -->", "<!-- AI-DAILY-LIST-END -->"


def main() -> None:
    p, href, day, text = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    dedup = "date"
    for a in sys.argv[5:]:
        if a.startswith("--dedup="):
            dedup = a.split("=", 1)[1]
    if dedup not in ("date", "href"):
        sys.exit(f"update-column-index: --dedup 只能是 date 或 href,收到 {dedup}")
    s = open(p, encoding="utf-8").read()
    i0 = s.index(START) + len(START)
    i1 = s.index(END)
    block = s[i0:i1]
    lis = re.findall(r"<li>.*?</li>", block, re.S)
    lis.append(f'<li><a href="{href}"><span class="d">{day}</span><span class="t">{text}</span></a></li>')
    seen, items = set(), []
    for li in lis:
        m = re.search(r"/(\d{4}-\d{2}-\d{2})[a-z0-9-]*\.html", li)
        if not m:
            continue  # 无合法日期(如注释里的模板示例行)一律丢弃
        hm = re.search(r'href="([^"]+)"', li)
        key = m.group(1) if dedup == "date" else (hm.group(1) if hm else li)
        if key in seen:
            continue  # 先出现者优先:已有条目在前,后 append 的新条目不覆盖
        seen.add(key)
        # 同一天多条时按链接倒序,让带序号的后续篇目稳定排在当天首篇之后
        items.append((m.group(1), hm.group(1) if hm else "", li))
    items.sort(key=lambda t: (t[0], t[1]), reverse=True)
    mid = (
        "\n"
        + "\n".join("    " + li for _, _, li in items)
        + "\n    <!-- 列表由部署脚本自动维护:按日期倒序,勿手工编辑 -->\n    "
    )
    s = s[:i0] + mid + s[i1:]
    s = "\n".join(l for l in s.split("\n") if 'id="ai-daily-empty"' not in l)
    open(p, "w", encoding="utf-8").write(s)


main()
