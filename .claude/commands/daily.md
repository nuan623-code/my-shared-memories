---
description: 每日更新 Claude Code 学习站（推进一课 + 2 条 Tip + 复核 + 部署）
---

按下面流程更新 Claude Code 学习站(本仓库 `public/claude-code/`,线上 https://mingyuyang.com/claude-code/)。今天的日期以运行环境提供的当前日期为准(env 里的 Today's date),下文记作 {{DATE}}。

## 第零步:本仓库的接入约定(与通用流程的差异,先记住)

- 状态文件在 `public/claude-code/state.json`(不是仓库根目录)。
- 所有页面只用 `/claude-code/assets/shared.css`(唯一样式来源)+ `assets/site.js`,head 里带主题引导内联脚本与 GA 片段——照抄 `course/template.html` / `tips/template.html` 的骨架,不要另起样式。
- `<title>` 必须干净(「标题 · Claude Code 学习站」),因为部署时 `scripts/sync-static-resources.mjs` 会按 `<title>` 自动把新页面登记进资料库。`course/template.html` 与 `tips/template.html` 是模板,已在 manifest 里 skip,不要往里写正式内容。
- 索引类页面靠 HTML 注释标记维护,只在标记对之间改:
  - `index.html`:`RECENT-START/END`(最近更新,最新在上,保留 10 条;同时更新两张卡片里的 `#course-count` / `#tips-count` 文案)
  - `course/index.html`:`COURSE-TABLE-START/END`(发布后该行标题变链接、状态改「已发布 + 日期」)
  - `tips/index.html`:`CLUSTER-X-START/END`(planned 项变链接项)+ `#tips-index` 内联 JSON 搜索索引(每条 `{"slug","title","cluster","question","summary","keywords":[]}`)
  - `changelog.html`:`CHANGELOG-START/END`(新条目插在标记下、最新在上)
- **站点是双语的(2026-08-05 起)**:英文镜像在 `public/en/claude-code/`,路径与 slug 与中文版一一对应。凡新写或修订一个中文页,必须同步产出/修订英文版;四个索引页(index / course/index / tips/index / changelog)两个语言都要更新(英文 tips-index JSON 用英文 title/summary/keywords)。互指规则:两边 head 都有 hreflang 三连(zh/en/x-default,x-default 指中文),topbar 有「EN/中文」切换链接;界面固定译法照抄任一已发布英文页(badge:Official/Third-party/Our take;Tip 四段:One-line answer/Steps/Copy-paste prompt/Sources & last verified)。资料库双语配对由 sync 脚本 keyFromBase 自动完成,无需手动。
- 部署 = `git add … && git commit && ./publish.sh --deploy-only`(它负责构建、部署 Cloudflare、把新页面同步进资料库、自动 push)。不要手动 push 之后再跑它。

## 第一步:读状态

读 `public/claude-code/state.json`。记住 `course.next_day`、`course.mode`、已发布的 `tips` 清单、`sources_watermark`。之后所有判断都以它为基准——不要凭印象认为某个内容「应该已经写过了」。

## 第二步:采集增量(先采集,再决定写什么)

按顺序抓取,全部记录抓取时间:

1. code.claude.com/docs/en/claude_code_docs_map.md —— 看有没有新文档页
2. code.claude.com/docs/en/whats-new/index.md —— 对比 state 里的 `latest_whatsnew_week`
3. code.claude.com/docs/en/changelog.md —— 对比 `latest_changelog_entry`
4. 今天要写的课程日和 tip 所对应的官方文档页,原文抓取
5. 补搜社区侧动态(新闻、社区讨论、相关 MCP/工具生态)

采集完先输出一份增量清单:哪些是真的新的,哪些只是本站之前没写。

## 第三步:更新板块一「系统课程」

1. `course.mode` 为 `writing` 时:写 `next_day` 这一课,发布到 `course/day-NN.html`
   - 内容必须基于第二步抓到的官方文档原文,不要凭记忆写
   - 每课包含:为什么这天学这个 → 概念讲清楚(复杂概念多给一种讲法:机制拆解 / 类比 / 对比 / 误区澄清)→ 当天能做完的实操步骤 → 验收标准(读者怎么知道自己学会了)
   - 有流程、机制、分层、因果、状态变化的地方配 SVG 图(用 shared.css 里的 `svg-*` 主题类,别写死颜色)
2. 检查第二步的增量是否影响已发布的课时。影响了就一并修订,并更新那一课页脚的「最后更新」日期。
3. 更新 state.json 的 `published_days` 和 `next_day`。
4. 14 课全部发布后,把 `course.mode` 改为 `revision`,之后每天挑一课做深化或按最新文档校正,并把新的进阶主题追加进 `outline`(day 编号顺延),课程不停更。

## 第四步:更新板块二「实战 Tip」

1. 从 `backlog` 里挑 **2 条**写(`starred: true` 优先;如果第二步的增量正好命中某条 backlog,优先写那条),分别发布到 `tips/<slug>.html`。**backlog 为空时跳过本小步**,当天只做复核(下面第 2 步)和新选题补充(第 3 步)——不要为了凑数硬写。
   - 严格用固定模板(见 `tips/template.html`):问题原句 → 一句话结论 → 做法步骤 → 可抄的 prompt → 来源与最后核实日期
   - `verbatim: true` 的条目是用户原话,标题保持原话不要改写
   - slug 用短英文 kebab-case,自己起,起了就不改
2. 复核已发布的 tip:`volatility` 为 high、且 `last_verified` 距今超过 14 天的,今天抓来源核一遍。有变化就改,没变化就只更新 `last_verified`。
3. 如果第二步发现了值得写但 backlog 里没有的新选题,追加进 `backlog`,不要今天就写。
4. 更新 state.json 的 `tips` 数组(新增条目含 slug/title/cluster/published/last_verified/volatility),写过的条目从 `backlog` 移除。

## 第五步:更新首页、索引与变更日志

- `index.html` 的「最近更新」与两张卡片的计数文案
- `course/index.html` 与 `tips/index.html` 的状态、分组与搜索索引 JSON
- `changelog.html` 顶部加今天一条:新增了什么、修订了什么、复核了什么

## 第六步:验证后再提交

不要跳过这一步,用能自己跑的检查:

1. 所有内部链接和锚点可达,没有 404(可用脚本扫 `public/claude-code/` 下所有 href/src 对应文件是否存在)
2. 新页面在浅色 / 深色 / 跟随系统三种模式下都正常(检查页面确有主题引导脚本 + `#theme-switch`,新增样式没写死颜色)
3. 移动端宽度下不横向溢出(新页面没有超宽的固定尺寸元素;表格/代码块都在可滚动容器里)
4. `state.json` 是合法 JSON,且与实际文件一一对应:`published_days`/`tips` 里登记的每个页面文件都存在,`course/`、`tips/` 下每个正式页面(index 与 template 除外)都已登记——有页面没登记、或登记了没页面,都要报错;**中英对称**:`public/claude-code/` 与 `public/en/claude-code/` 的正式页面(template 除外,en 无 template)必须一一对应,缺一边都要报错
5. 全部通过后再 `git add … && git commit`(message 写清今天动了什么,如 `claude-code: {{DATE}} D3 权限模式 + 2 tips`),然后 `./publish.sh --deploy-only`,确认线上探活 200(`curl -sL` 跟随 307)
6. **任何一项验证不通过就不 commit、不 push、不部署**,把失败项写进摘要明确报错,留给人工处理

## 硬性约束

- **不编造。** 版本号、价格、命令名、API 名称、文档路径,只写第二步实际抓到的。抓不到就在页面上写明「未能核实」,并说明缺什么。
- **三徽章分离。** 官方文档写了的(`badge-official`)/ 第三方社区说的(`badge-third`)/ 本站的判断和编排(`badge-site`),必须分开标注。本站观点不能伪装成官方结论。
- **允许无更新。** 如果第二步确认今天没有真正的增量,就只做课程推进和 tip 复核,changelog 如实写「今日官方无更新」。不要为了填内容编东西,也不要把旧内容换个说法当新的发。
- 每条事实可追溯到页脚来源清单里的某一条。
- **保持原话。** backlog 里 `verbatim: true` 的标题不要改写成更「专业」的说法。
- 更新 `sources_watermark`(含 `checked_at`)与 `last_run`,每天必须写。

## 输出

做完给一份三行以内的摘要:今天发布了什么、修订/复核了什么、线上地址。验证失败时改为报错说明。不要复述过程。
