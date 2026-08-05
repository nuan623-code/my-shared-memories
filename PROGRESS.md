# PROGRESS — Claude Code 学习站

> 记录时间:2026-08-05。本文件按用户要求,在全量回归完成后写下当前状态、回归结果与待办。
> 板块运维说明见 [CLAUDE-CODE-SITE.md](CLAUDE-CODE-SITE.md),仓库总维护指南见 [AGENTS.md](AGENTS.md)。

## 一、当前状态

- **线上**:https://mingyuyang.com/claude-code/ 全量可用。系统课程 D1–D14 共 14 课、实战 Tip 六簇共 25 条,全部于 2026-08-05 一次性发布(应用户要求,未走每日渐进)。
- **提交**:`77fa244` 骨架初始化(PROMPT-0)→ `01780a4` 全量首发(46 文件,+5507 行)。均已 push `origin/prod`,工作区干净。
- **state.json**(`public/claude-code/state.json`):`course.mode = revision`,`next_day = 15`,`published_days` 1–14,`tips` 25 条(published/last_verified 均 2026-08-05),`backlog = []`,水位 `claude_code_version 2.1.222 / latest_whatsnew_week 2026-w29 / checked_at 2026-08-05`。
- **配套已就位**:39 篇全部自动入资料库(AI 学习 → Claude Code 子分类);主站首页「工具」区入口卡;`/daily` 命令(`.claude/commands/daily.md`,已含 backlog 为空时的行为);运维文档与 changelog 均与现实一致。
- **内容生产方式**(备查):20 个并行子代理写成(14 课程 + 6 Tip 簇),每个代理先 `curl` 抓取对应官方文档原文再动笔,统一遵循 scratchpad 的 CONTENT-BRIEF 规范(三徽章、固定模板、SVG 主题类、禁 emoji、verbatim 标题不改写)。

## 二、全量回归结果(全部通过)

**本地校验套件**
- state.json 合法 JSON;与文件一一对应(登记页面均存在、无未登记页面)——PASS
- 全站内部链接/资源扫描——PASS(唯一"断链"报告 `/articles/ai-notes-multi-session-vs-multi-agent` 实为主应用 SPA 路由,线上验证 200,非静态文件,属检查器误报)
- Tip 搜索索引 25 条,slug 与 state 完全一致——PASS
- 14 个课程页结构抽检:主题引导脚本、GA、canonical、shared.css/site.js 引用、官方徽章齐全,noindex 已移除,篇幅 17–24KB——PASS
- emoji 扫描:仅 `day-09.html` 与 `image-gen-tools-with-claude-code.html` 的 `<code>` 块含 `✔`/`✘`,为 `claude mcp list` 等 CLI 真实输出的忠实引用,有意保留——PASS(记录在案)

**浏览器实测(本地 dev server)**
- 三档主题(跟随系统/浅色/深色)切换与持久化正常;深色下 SVG 图、徽章、代码块均正确换色
- 移动端 375px 无横向溢出(scrollWidth == clientWidth)
- 目录自动生成+滚动高亮、阅读进度条、prompt 复制按钮正常
- Tip 搜索实测:"cache" 命中 2 条、"worktree" 命中 1 条、清空恢复 25 条簇内链接
- 控制台无本板块错误(仅主应用已知的 hreflang 开发态告警,见 AGENTS.md)

**线上回归**
- `publish.sh --deploy-only` 全流程成功:构建、Cloudflare 部署、资料库同步(39 篇入库)、探活 `/`、`/auth`、文章页 200、push origin/prod
- **39 个内容页全量 curl 探活:全部 200**(`tips/scheduled-tasks.html` 首次探活 404,为 Cloudflare 边缘缓存传播延迟,约 10 秒后 200;此前 `/claude-code/` 也出现过同样现象,均自愈)
- 主站首页 SSR HTML 确认含「Claude Code 学习站」入口卡

## 三、代理执行帐目(异常与处置)

- **C 簇代理**:写完全部 4 页后、收尾自检时因网络错误(ECONNRESET)中断,未交回元数据。处置:逐页人工核验结构/来源/volatility 后采用,元数据由主会话从页面提取补齐。「Claude Design」已查实为 Anthropic Labs 官方产品(带 anthropic.com 公告与官方帮助文档来源)。
- **D1/D2/D4/D5/D6 五个课程代理**:系统提示"无完成记录"(进程退出时被孤儿化)。处置:**无需恢复**——五课产物完整落盘、通过结构校验、随 `01780a4` 上线且线上 200,工作已实际完成。
- **D12 代理**:发现并修正了本站简报中一处与官方文档不符的表述,按文档实情写入(「不编造」约束生效的实例)。
- 本会话环境曾出现两次网络瞬断与浏览器面板超时,均未影响最终交付物。

## 四、待办事项

1. **明日起每天跑 `/daily`**(revision 模式):抓官方增量 → 挑一课深化/按最新文档校正 → 复核到期 tip → 新选题入 backlog → 验证通过才部署。
2. **复核高峰要分摊**:25 条 tip 中 22 条 volatility=high 且 `last_verified` 同为 2026-08-05,将在 **2026-08-19 同日到期**。建议 /daily 从 08-12 前后开始每天提前复核 2–3 条摊平,避免当天积压(或接受当日批量复核,酌情)。
3. **backlog 为空**:每日第二步发现的新选题只入 backlog 不当天写;攒到有存货后恢复"每天 2 条"节奏。
4. **课程进阶主题**:revision 模式下把官方新能力(如后续新文档页)追加进 `course.outline`(day ≥ 15)。
5. 可选增强(未排期,视用户意愿):英文版 `en/claude-code/`、课程页专属 og:image、GA 事件细分(搜索词/主题切换)、Tip 搜索升级为真全文。
