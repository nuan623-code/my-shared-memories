# PROGRESS — Claude Code 学习站

> 记录时间:2026-08-05(英文版补录于同日晚)。本文件按用户要求,在全量回归完成后写下当前状态、回归结果与待办。
> 板块运维说明见 [CLAUDE-CODE-SITE.md](CLAUDE-CODE-SITE.md),仓库总维护指南见 [AGENTS.md](AGENTS.md)。

## 〇、英文版补录(2026-08-05 晚,commit `b6c7035` + `214229e`)

- 应用户指出「怎么没有英文版」(原 spec 即为中英双语站),当日补齐 **`public/en/claude-code/` 全量英文镜像 43 页**(14 课 + 25 Tip + 4 索引/日志页),线上 https://mingyuyang.com/en/claude-code/ 全部 200。
- 由 11 个翻译代理完成(10 首发 + 1 补翻:D1–D4 代理网络中断后 day-01 已落盘,D2–D4 由补派代理完成);统一遵循 EN-BRIEF 固定译法(badge = Official/Third-party/Our take,Tip 四段 = One-line answer/Steps/Copy-paste prompt/Sources & last verified)。
- 基建:中文 43 页注入 hreflang 三连 + 「EN」切换,英文页反向互指;`site.js` 按 `<html lang>` 切界面文案;sync 脚本 `keyFromBase` 生成 i18n_key 做中英资料库配对(存量中文行 SQL 回填);主站 TOOLS 卡支持 `hrefEn`。
- 回归:中英 41 内容页/侧一一对应 PASS;双树内部链接 PASS;en 结构检查 PASS(仅索引页 HTML 维护注释含中文,有意保留);en 搜索实测(cache 命中 2 条、链接指向 /en/、英文无命中提示);线上 43 页全量 200(5 页首测 404 为边缘缓存延迟,约 20 秒后自愈)。
- 已知修正:首批 en 行入库标题带「· Claude Code Learning Hub」尾缀,cleanTitle 已修 + SQL 订正存量(`2026-08-05-claude-code-en-titles.sql`)。
- **每日任务已改为中英同步**:新写/修订页面两个语言都发,四个索引页两边都更新(见 daily.md 第零步);中英对称已加入第六步验证。

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
- **英文版 D1–D4 翻译代理**:网络错误中断,day-01 已落盘,day-02/03/04 由补派代理完成;11 个翻译代理产物均逐页校验(无残留中文、hreflang 齐全、内链指向 /en/)。
- 本会话环境曾出现数次网络瞬断与浏览器面板超时,均未影响最终交付物。

## 四、待办事项(2026-08-05 晚订正,与英文版补录后的现状一致)

1. **明日起每天跑 `/daily`**(revision 模式,**中英同步**):抓官方增量 → 挑一课深化/按最新文档校正 → 复核到期 tip → 新选题入 backlog → 中英两版页面与四个索引页同步更新 → 验证(含中英对称检查)通过才部署。
2. **复核高峰要分摊**:25 条 tip 中 22 条 volatility=high 且 `last_verified` 同为 2026-08-05,将在 **2026-08-19 同日到期**。建议 /daily 从 08-12 前后开始每天提前复核 2–3 条摊平(复核改动同时更新英文版),避免当天积压。
3. **backlog 为空**:每日第二步发现的新选题只入 backlog 不当天写;攒到有存货后恢复"每天 2 条"节奏。
4. **课程进阶主题**:revision 模式下把官方新能力(如后续新文档页)追加进 `course.outline`(day ≥ 15),新课中英同发。
5. ~~英文版 `en/claude-code/`~~ **已于 2026-08-05 晚完成**(见第〇节)。其余可选增强(未排期,视用户意愿):课程页专属 og:image、GA 事件细分(搜索词/主题切换)、Tip 搜索升级为真全文。
