# 网站整体重构 — progress

> 状态:**方案 v1 已出,等用户确认。用户确认前不写任何实现代码。**
> 方案文档(含三个视觉方向 mockup):https://claude.ai/code/artifact/4fe15f4a-fb64-4748-963f-7b796f35fa43
> 注意:本文件是重构项目的 spec/进度;`PROGRESS.md`(大写)是 claude-code 学习站的,别混。

## 访谈结论(2026-08-06 ~ 08-08)
- 定位:**公开读者为主**的内容站(扩大影响力)。
- 访客四路径全要,主次由方案排定:① 读内容 ② 持续回访 ③ 了解我 ④ 用作品。
- 痛点四项全中:板块无主线 / 首页不对劲 / 视觉不统一 / 分类混乱。
- 视觉:用户选"先出方向给我挑",方案里给了 A 深蓝传承 / B 杂志纸感 / C 极简工程 三个方向。

## 摸底事实(2026-08-08 实测线上)
1. 主导航(首页/资源库/碎片/关于)不含三个日更栏目与学习站,后者只在首页工具卡里。
2. /notes 碎片广场 0 帖,占导航一席。
3. /resources 209 卡平铺,类型/分类/标签三层筛选交叉("视频"双重身份、"碎片笔记"与"碎片"撞名)。
4. /ai-daily/ 与 /ai-briefing/ 两归档页 `<title>` 完全相同("AI 每日简报 · 往期归档");前者实为"深度学习"栏目,7 月改名未同步。
5. 首页 hero 文案自我视角("我想记录、分享的任何东西")。
6. 视觉四套皮:主站(oklch 浅蓝 + Outfit/Figtree)、学习站(rgb(244,248,253) + 静态 Figtree + 自有导航 + 三档主题)、归档页(系统字体)、文章 iframe 内页(米白 rgb(250,247,242) + 系统字体)。主站暗色 token 是死代码(无开关);学习站有主题切换。

## 目标
把"每天 +1 长出来的站"改成有整体信息架构的公开内容站:导航反映真实内容,首页长度恒定不再随内容增长变乱,四类页面一套视觉。

## 明确不做
- 不动每日自动化管线(ai-daily / ai-briefing / claude-code /daily、launchd、sync 脚本的产出逻辑)。
- 不动 SEO 资产:已有 301/_redirects、canonical/hreflang 结构、sitemap 逻辑。
- 不动双语架构(/en/ 路由模式)与 Supabase 数据结构(只动展示层)。
- 不删碎片功能代码,只从导航下架。

## 阶段划分(提案,待确认)
### 阶段 1:信息架构 ✅ 2026-08-08 上线,等用户验收
- 内容:导航改为 首页/每日更新/文章/工具/关于;新首页六区(Hero/今日更新条/招牌精选/三栏目导览/作品带/关于+订阅);碎片移出导航;/ai-daily/ 归档页改名"AI 深度学习"。
- 验收标准(线上 mingyuyang.com 实测,commit 6218f55):
  - [x] 导航项 = 首页/每日更新/文章/工具/关于(中英两版)
  - [x] 首页高度 2688px @1280×720 ≈ 3.7 屏(标准 ≤6 屏);"今日更新"区显示三栏目最新内容
  - [x] /notes 不再出现在导航(路由与功能保留)
  - [x] 两个归档页 `<title>` 不同:/ai-daily/ =「AI 深度学习 · 往期归档」,/ai-briefing/ =「AI 每日简报 · 往期归档」
- 实现备注:
  - 招牌精选 = `src/routes/index.tsx` 的 `FEATURED_SLUGS`(zh/en 各 6 篇,人工钉选,换篇改数组)
  - 新增共享:`lib/tools.ts`(作品数据)、`lib/columns.ts`(三栏目元数据)、`components/ToolCard.tsx`、`resources.resourceHref`
  - /daily 门厅页(三栏目各最新 5 条)、/tools 作品页,均有 /en 薄封装与 SSR loader
### 阶段 2:列表页 ✅ 2026-08-26 实现,本地实测通过,待部署与验收
- 内容:资源库默认按栏目分组、筛选收成一层、分页;`?cat=` 直达保留。
- 摸底(实测 232 条,推翻了原本的"三层筛选"假设):
  - `type` 字段 **100% 是 article** —— 类型筛选 6 个选项里 5 个永远空。
  - `category` 只用到 `ai`(208)与 `article`(24);data.ts 里另外 6 个分类(game/homework/
    video/tool/file/note)**零条数据**。所谓"视频"双重身份其实是空分类。
  - 有区分度的只有 `subcategory`(8 个值),它正好等于站上真实的内容线。
  - 88 个标签里排前三的(Claude Code 89 / AI 简报 44 / AI 深度学习 41)就是 subcategory 的复制品。
  - 41 条英文版与中文版共享 `i18n_key`,列表里两张一样的卡并排。
- 做法:新增 `lib/library.ts` 作为栏目轴 —— 8 个 subcategory 分两族(手写长文 5 / 每日栏目 3),
  长文族排前面,免得 163 条日更把 69 篇长文压到看不见;栏目名与颜色复用 data.ts,不另建一份。
  `dedupeByLocale()` 按 i18n_key 去重,成对时留当前界面语言那版(232 → 191)。
- 验收标准:
  - [x] 默认视图按栏目分组,首屏渲染卡片 ≤24 张(8 组 × 每组 3 张 = 24,实测 SSR 24)
  - [x] 筛选只剩一层(类型轴、标签轴撤掉,只剩栏目)
  - [x] `?cat=` 链接不失效(`?cat=ai` → 18 卡 / 6 组,`?cat=article` → 6 卡 / 2 组)
  - [x] 分页:单栏目 24 条一页,`?page=` 超界夹回末页(claude-code 39 条 → 24 + 15)
  - [x] 中英一致:`validateResourcesSearch` 由 /resources 与 /en/resources 共用

### 阶段 2 期间记到的待办(不属于阶段 2,未处理)
- **全站 hydration 失败**:每页控制台报 `Hydration failed` + `Invalid DOM property hreflang`。
  源头是 `lib/i18n/head.ts` 用小写 `hreflang` 作 links 的键 —— SSR 输出正确,但客户端 React
  认为是非法属性并丢弃,于是 head 对不上,React 丢掉整份 SSR HTML 重渲染。
  这直接抵消了 resources.tsx 里 SSR 预取的初衷(给不执行 JS 的 AI/搜索爬虫看)。
  在 /about(本次完全没动过的页)上稳定复现,与阶段 1/2 的改动无关。改法要验证
  TanStack 的 head 渲染器在客户端认不认驼峰,得单独跑一轮,别顺手改。
### 阶段 3:视觉统一(方向 A 深蓝传承)✅ 2026-08-26 实现,本地实测通过,待部署与验收
- 内容:选定方向落成 design token;主站/学习站/归档页/文章外壳四类页面统一;暗色按方向处理(激活或移除死代码)。
- 做法:**以学习站 `public/claude-code/assets/shared.css` 为基准,让主站对齐它**,而不是反过来 ——
  学习站那套本来就是「深蓝传承」,而且是四套里唯一完整的(全套 token + 暗色 + 三档开关)。
  主站 `styles.css` 的 `:root` 数值换成学习站调色板的 oklch 写法(hex↔oklch 往返逐个校验过,精确一致)。
- 改前实测(oklch 换算成 hex 后对比):
  | | 背景 | 正文 | 强调色 | 边框 | 字体 | 暗色 |
  |---|---|---|---|---|---|---|
  | 主站 | `#e8f4ff` | `#0c1a32` | `#1156c1` | `#c0d3e8` | Outfit/Figtree | 死代码 |
  | 学习站 | `#f4f8fd` | `#16233d` | `#1a63ff` | `#dce6f2` | Outfit/Figtree | 有开关 |
  | 归档页 ×2 | `#f4f8fd` | `#1a2b47` | `#1a63ff` | `#dce6f2` | 系统字体 | 无 |
- 验收标准:
  - [x] 四类页面实测背景色与字体一致:主站 / 学习站 / 归档页 / 文章外壳 四者浏览器实测
        均为 `#f4f8fd` + `#16233d`,正文 Figtree、标题 Outfit(主站是 Figtree/Outfit Variable,同一字体家族)
  - [x] 暗色**激活**(不是删除):`.dark` 死代码换成与学习站同构的三档
        (无 `data-theme` = 跟随系统 / `light` / `dark`),Header 加三档开关 `ThemeSwitch`,
        与学习站共用 `localStorage['cc-theme']` —— 实测在主站选深色后进学习站仍是深色(`#0a1424`),反之亦然。
        暗色数值 = 学习站已设计好的那套,不是新编的。
  - [x] 首屏不闪白:`__root` head 里一段 pre-hydration 脚本在 React 之前写 `data-theme`;
        `<html>` 上加 `suppressHydrationWarning`(服务端不可能知道 localStorage 里的选择,
        这是该属性的既定用法,不掩盖子树内的任何 mismatch —— 干净标签页实测该条报错已消失)
  - [x] `color-scheme` 跟着主题走,否则深色页面挂一条亮白滚动条
- 同时改到的:`scripts/render-briefing.py` 的 `<style>` 块(字体声明 + `--ink` 取值)。
  **只动样式声明,没动任何产出逻辑**,模板 `.format()` 占位符与转义大括号已验证仍正常。

### 阶段 3 没做、也不建议顺手做的:158 个文章内页
`/articles/<slug>` 的**外壳**已统一,但 iframe 里的**内页**没有,也不该在本阶段统一:
- `public/` 下 158 个静态文档(ai-notes 43 / ai-daily 65 / ai-briefing 45 / overseas 5)**各有各的主题**,
  光 `--bg` 就有 12+ 种取值(`#eef4fb` 20 个、`#f3f7fc` 6 个、`#fbfaf8`、`#faf7f2`,还有 `#0d0c0b` 这类深底)。
  实测 `/articles/ai-notes-multi-session-vs-multi-agent`:外壳 `#f4f8fd`,内页 `#fbfaf8` + 系统字体。
- 这些不是疏忽,是**生成方式的产物** —— 文档由 content-to-html 类流程按内容气质逐篇原创配色。
  统一它们 = 重写 158 份已发布文档的视觉,且要改生成模板,撞上「明确不做:不动每日自动化管线的产出逻辑」。
- 若之后要做,建议按此顺序:① 先定一份可选的共享主题表 ② 只对新产出生效 ③ 存量按目录分批回填,
  每批人工过一遍(有些文档的配色是内容的一部分,例如深色底的那几篇)。别一次性全刷。
### 阶段 4:承接转化
- 内容:hero 新文案(提案"每天讲透一个 AI 主题",待定)、关于页加厚、订阅入口统一、文章页文末"下一篇+订阅"。
- 验收标准:
  - [ ] hero 不再是"我想记录…"自我视角文案
  - [ ] 关于页含 我是谁/在产出什么/怎么找我 三段
  - [ ] 文章文末有同栏目下一篇 + 订阅入口

### 保鲜改造(2026-08-26,阶段 2/4 的前置零件,已实现待部署)
起因:内容天天更新,但首页门面层是硬编码的,回访读者看不出站在动。
- [x] **招牌精选半自动**:`index.tsx` 的 `FEATURED_SLUGS` 改为 `PINNED_SLUGS`(钉 2 篇)+ 自动补位
  (最近 30 天阅读量 → 最新长文),自动池只取手写长文,不含三个每日栏目。首页每周自然换血。
- [x] **Hero 数据条**:连更天数 / 内容总数 / 手写长文数,`lib/site-stats.ts` 由 resources 现算,不新增请求。
  连更从「最近一次出刊那天」往回数(今天没出刊 ≠ 断更,不打成 0);站真停更由旁边「更新于 X」照实说。
- [x] **RSS**:新增 `/rss.xml`(50 条,只出中文主站,canonical 口径与 sitemap 一致),
  `__root.tsx` 加 `<link rel=alternate>` 自动发现,Footer 加入口。此前全站没有 feed。
- [x] **日期错位(待办③)**:新增 `resources.contentDate()` —— 从 slug/url 里的 YYYY-MM-DD 取内容日期,
  取不到才回落 published_at。首页今日格、/daily、RSS 已切过去。**不改库,只改展示层**,管线零改动。
- [x] **Footer 占位链接(待办②)**:GitHub/LinkedIn/邮箱换成真实地址。
- [x] **摘要为空(待办①)**:今日格增加摘要行;`scripts/backfill-summaries.mjs` 从各栏目已生成的静态 HTML
  抽摘要补 NULL(ai-daily 取 `p.lede`、ai-briefing 取「今日头条」首条、其余取 meta description)。
  干跑可补 137 条(daily 23 / briefing 35 / claude-code 78 / 其他 1)。**--apply 尚未执行,待站长本人跑。**
- 顺带:`lib/views.ts` 的 `fetchTopViewed` 加了按 viewed_at 倒序 —— PostgREST 单次只回 1000 行,
  不排序拿到的是窗口最早那批,热榜会被一个月前的数据主导。

## 当前状态
2026-08-08:用户确认方案(视觉选**方向 A 深蓝传承**,结构与施工顺序无异议)。阶段 1 已实现、部署上线并通过全部四条验收(见上),等用户验收后进阶段 2(列表页)。
- 阶段 2 前置已就绪:`?cat=` 直达仍有效(resources.tsx validateSearch 未动)。
- 后续记到的待办:①简报入库时 summary 为空,今日格只能显示"AI 每日简报·日期",建议管线补当日头条(阶段 4 或管线小改);②Footer 的 GitHub/LinkedIn/邮箱还是占位链接(github.com/linkedin.com/hello@example.com),阶段 4 一并换真实链接;③briefing/daily 行的 published_at 是入库时间,与内容日期有偏差(如 8/5 简报显示 08-08),阶段 4 可考虑回填。
- 2026-08-26:做了上面的「保鲜改造」。剩一步要站长自己跑(要 ~/.ms-supabase-admin 写库权限):
  `node scripts/backfill-summaries.mjs`(先干跑)→ 确认后 `--apply`,再 `./publish.sh --deploy-only` 部署。
- 2026-08-26:阶段 2 已实现(见上),本地 tsc + build + SSR 实测通过,**未提交未部署**。
  阶段 1 遗留的三条待办(①摘要空 ②Footer 占位 ③日期错位)已在保鲜改造里全部处理。
- 2026-08-26:阶段 3 已实现(见上),tsc + build + 浏览器实测通过,**未提交未部署**。
