# Claude Code 学习站 · 运维说明

> 板块位置:`public/claude-code/` → 线上 https://mingyuyang.com/claude-code/
> 初始化:2026-08-05(PROMPT-0)。此文件相当于该板块的 README:怎么部署、每日任务怎么跑、state.json 怎么接力。

## 这是什么

mingyuyang.com 的一个每日更新板块,面向想认真用好 Claude Code 的开发者:

- **板块一「系统课程」**(`course/`):线性 14 课,每天发布一课;写完转入复习修订模式(每天深化/校正一课,进阶主题追加进课表)。
- **板块二「实战 Tip」**(`tips/`):非线性、可检索,每条单页自足;**每天发布 2 条**(用户 2026-08-05 定),选题来自 state.json 的 backlog(约 25 条,starred 优先)。

## 目录结构

```
public/claude-code/
├── index.html            板块首页:两大板块入口 + 最近更新(RECENT 标记维护)
├── course/
│   ├── index.html        课程总览:课表 + 状态(COURSE-TABLE 标记维护)
│   ├── template.html     课程页结构模板(样例,noindex,已在 manifest skip)
│   └── day-NN.html       每课一页(每日任务生成)
├── tips/
│   ├── index.html        Tip 索引:六簇分组(CLUSTER-X 标记)+ 搜索(#tips-index 内联 JSON)
│   ├── template.html     Tip 页结构模板(样例,noindex,已在 manifest skip)
│   └── <slug>.html       每条 tip 一页(每日任务生成)
├── changelog.html        每日变更日志,倒序(CHANGELOG 标记维护)
├── assets/
│   ├── shared.css        唯一样式来源(三档主题、徽章、文档布局、SVG 主题类)
│   └── site.js           主题切换 / 进度条 / 目录 / 搜索 / prompt 复制
└── state.json            状态接力文件(见下)
```

## state.json:每日任务的接力棒

每日任务**先读它决定今天写什么,做完必须更新它**。没有它,每天的 Claude Code 不知道昨天做到哪,会重复写或跳着写。

| 字段 | 含义 |
|---|---|
| `last_run` | 上次运行日期 |
| `course.next_day` / `published_days` | 下一课编号 / 已发布课列表 |
| `course.mode` | `writing`(14 课未写完)/ `revision`(复习修订模式) |
| `course.outline` | 课表(day/slug/title);revision 模式下进阶主题往后追加 |
| `tips[]` | 已发布 tip:slug/title/cluster/published/last_verified/volatility。`volatility: high` 且 `last_verified` 超 14 天 → 当天要复核 |
| `sources_watermark` | 判断「今天有没有真的新东西」的水位:claude_code_version / latest_whatsnew_week / latest_changelog_entry / checked_at,**每天必须更新** |
| `backlog[]` | Tip 选题池:cluster/title/starred/verbatim。`verbatim: true` 的标题是用户原话,**不许改写** |

## 每日任务怎么跑

每天在本仓库开一个 Claude Code 会话,输入 `/daily` 即可(prompt 全文在 `.claude/commands/daily.md`)。流程:读 state → 抓官方文档增量(docs map / What's new / changelog)→ 写一课 + 2 条 tip → 复核到期 tip → 更新索引与 changelog → 自检(链接、三主题、移动端、state 与文件一一对应)→ **全部通过才** commit + `./publish.sh --deploy-only`;验证不过就不 push,摘要里明确报错。

## 部署

复用主站链路,无独立部署:

```bash
./publish.sh --deploy-only   # 构建 → Cloudflare Workers → 新页面自动入资料库 → 探活 → push prod
```

- 资料库同步:`scripts/sync-static-resources.mjs` 已加 `claude-code/course`、`claude-code/tips` 两条扫描(category `ai` / subcategory `claude-code`,标签「Claude Code」,标题取 `<title>`);两个 template 页在 `scripts/resources.manifest.json` 里 skip。
- 首页入口:`src/routes/index.tsx` 的 TOOLS 数组有「Claude Code 学习站」卡片;资料库分类面板的子分类在 `src/lib/data.ts`(AI 学习 → Claude Code)。
- 线上探活注意 `/claude-code/` 目录路径可能 307 到带斜杠地址,curl 要 `-L`。

## 设计约定

- 页面自带三档主题(跟随系统/浅色/深色,localStorage 键 `cc-theme`),head 里的内联引导脚本防白闪——新页面照抄 template。
- 来源三徽章必须视觉可分:`badge-official`(蓝色实心)/`badge-third`(琥珀描边)/`badge-site`(紫色虚线)。本站观点不得伪装官方结论。
- 遵守主站设计铁律:不用 emoji;字体 Outfit/Figtree;颜色一律走 shared.css 变量。
