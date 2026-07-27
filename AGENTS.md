<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

---

# 维护指南 — mingyuyang.com（Lovable 块以上归 Lovable，勿动；以下归维护者）

> 给接手的 AI:先读这一页,别重新侦察仓库。

## 核心原则(2026-07-02 用户改)
**「Lovable 是功能真理源」规则已废除**:任何文件都可以直接修改、修 bug、按需求改造,不用再"等 Lovable 修"或先停下来问。
仍然成立的两条:
- **不为改而改**:Lovable 写的能正常工作的代码不去重写/重构/"优化",改动只服务于明确的需求或 bug。
- **改了就登记**:凡动过 Lovable 侧的文件,在下面的文件地图记一行(它现在的作用 = 合并冲突时"保留本端"的清单)。若以后还拉 Lovable 更新,冲突一律以 prod 本端为准。

## 不变事实(已钉死,别再去查)
- **仓库**:GitHub `nuan623-code/my-shared-memories`,与 Lovable 双向同步。本地 `~/my-shared-memories`。
- **分支模型**:`main` = Lovable 镜像(**只读,永不手改、不 force-push/rebase**);`prod` = main + 去 Lovable 叠加(**从这里构建部署**)。
- **栈**:TanStack Start(React 19 + Vite)+ Tailwind v4 + shadcn/Lucide + Supabase,部署 **Cloudflare Workers**。
- **Supabase**:project ref `mrkcesmmlmuhycdisgsy`。**只用 publishable/anon key,靠 RLS 保护;service_role / secret key 永不进 .env 或 git。**
- **托管**:Worker `nuan623-code-my-shared-memories`,绑定 `mingyuyang.com`。
- **登录**:用户自己的 Google OAuth(Google Cloud 项目 `labubuvision`),回调到 Supabase。
- **部署**:`~/.cf_token` 存 Cloudflare API token。本地用 **npm**(非 bun);`npm run dev` → http://localhost:8080。
- **`.env` 陷阱(必读)**:Supabase URL/key 在**构建时**从 `.env` 内联进产物,缺了线上连不上库。但 Lovable 在 `main` 上**跟踪着它自己的 `.env`**(指向 Lovable 的 Supabase),`git checkout main` 会覆盖本地 `.env`、切回 `prod` 又删掉它。所以**真实 `.env` 的主备份存在仓库外 `~/.my-shared-memories.env`**,`publish.sh` 构建前会从这里还原。手动构建/部署前务必先 `cp ~/.my-shared-memories.env .env`。key 变了就更新这个备份。

## 迁到自己 Supabase 的配置清单(Lovable Cloud 当年自动做了,自己的库要补)
代码搬过来后,纯读库的功能正常,但**依赖后端配置/初始数据**的功能会坏。`schema.sql` 已幂等覆盖前两项,第 3 项只能后台点:
1. **首个管理员**:`schema.sql` 末尾按登录邮箱给 `user_roles` 插 `admin`。不设的话 `/admin` 一直把你弹到 `/account`,Google 登录也像"没反应"。换邮箱改那段 WHERE。
2. **存储桶 `resources`**:`schema.sql` 用 `INSERT INTO storage.buckets` 幂等建。不建的话文件/封面上传全失败。
3. **邮箱免确认**:Supabase 后台 → Authentication → Providers → **Email → 关掉 Confirm email**(SQL 改不了,只能后台)。否则邮箱注册后没 session,像"注册了登不进"。
4. **(可选)Cloudflare secret**:自动分类 `ANTHROPIC_API_KEY`、微信导入 `FIRECRAWL_API_KEY`,`wrangler secret put` 设;不设只是对应按钮提示未配置。

## 我的地图:本端改过的文件(合并时保留本端)
2026-07-02 起任何文件都可改(见核心原则);这张表登记所有本端改动,合并 Lovable 更新时按它解冲突。
| 文件 | 我做的事 |
|---|---|
| `src/routes/auth.tsx` | Google 登录用原生 `supabase.auth.signInWithOAuth`(不是 `lovable.auth`) |
| `src/routes/__root.tsx` | 去掉 `reportLovableError`,meta 改本站;2026-07-10 接入 GA4(衡量 ID `G-3GRX3Y2VQJ`):head 注入 gtag.js(`send_page_view:false`),RootComponent 首屏发一次 page_view 并订阅 router `onResolved`(pathChanged 时)补发 SPA 页面浏览;2026-07-27 加 `apple-itunes-app` meta(app-id 6788002593)= 随读 App 的 iOS Safari Smart App Banner |
| `src/routes/articles.$slug.tsx` | 文章 iframe **高度自适应内容**(整页滚动,不再是固定小窗口);进度条改由外层页面滚动驱动;段落批注层 enabled 恢复为 annotationsOn;2026-07-06 顶栏「约 X 分钟」旁显示「收录于/更新于」日期(≥sm 显示,同日只显示收录);2026-07-06 外壳目录统一格式:`cleanTocText` 去 emoji + 剥离各文档自带编号(01/①/一、/SECTION/Part),h2 由外壳按序补 01 02 编号,清洗后为空的标题不进目录;目录手风琴化:h2 常驻、h3 只在当前活跃章节下展开(无 h2 的文档全量显示);iframe 隐藏清单加 `.toc-btn`(新批次文档的 ☰ 按钮);2026-07-27 正文末尾(上下篇导航之前)插 `SuiReadPromo` 推广卡。合并冲突时保留本端 |
| `src/components/SuiReadPromo.tsx` + `public/suiread-icon.png` + `src/components/Footer.tsx` | 2026-07-27 新增「随读 SuiRead」App 推广(App Store id `6788002593`,源码在 `~/Documents/suiread-kickoff`):推广卡放文章页末尾,含 App Store 按钮 + 「下载本文 HTML」直达按钮(仅站内本地 HTML 传 url,外链文章只显示 App Store 按钮),两个按钮各发一条 GA4 事件 `suiread_promo_appstore_click` / `suiread_promo_download_html`;`SUIREAD_APP_STORE_URL` 由本组件导出,Footer 的「随读 App」链接复用它。图标由 app 的 `icon-1024.png` 用 sips 缩到 256px |
| `src/components/ParagraphCommentLayer.tsx` | 修复批注标记定位(原先全挤右上角):标记坐标加 iframe.offsetTop、跳过 0 高度元素、ResizeObserver 盯正文任何布局变化重扫(替代一次性延时)。合并冲突时保留本端 |
| `src/routes/robots[.]txt.tsx` | sitemap 指向 `mingyuyang.com`(原指向 lovable.app) |
| `src/routes/about.tsx` | 2026-07-13 应用户要求删去职位头衔(姓名下方一处 + 简介句中一处) |
| `src/routes/index.tsx` | 首页改「分类分区」布局:按 lib/data 的 categories 上下分块(AI 学习在上、公众号文章在下,空分类不显示),卡片纯文字不放封面图;hero 统计卡点击滚动到分区;原类型筛选条/瀑布流已移除;2026-07-05 AI 分区内再按子分类分组(智能体/大模型/AI 工程…,未知归「其他」);2026-07-06「近期亮点」升级为「最近更新」模块(3 亮点卡 + 第 4–10 条时间列表),卡片日期补年份,7 天内资源加「新」徽标;2026-07-07 新增「工具」分区(数据驱动的 `TOOLS` 数组,链到 `public/` 下的独立静态页面如 `/projects/wechat-md/`,用 `<a>` 非 `<Link>`);2026-07-08 TOOLS 加「AI 每日简报」入口(`/ai-daily/`);2026-07-19 首页取数去掉 `limit:60`(时间倒序截断会把最老的公众号文章挤出首页,每日简报每天挤一篇;现取全量,近 1000 条时再做分页);2026-07-27 TOOLS 加「随读 SuiRead」外链卡片(排第一,href 用 `SUIREAD_APP_STORE_URL`),同时给 TOOLS 项加三个可选字段 `icon`/`cta`/`gaEvent`(有 icon 用 `<img>` 替掉扳手图标、cta 替掉「打开」、gaEvent 点击发 GA4;站内工具不传则表现不变)。合并冲突时保留本端分区布局 |
| `src/lib/resources.ts` | 2026-07-06 新增 `formatDate`(中文完整日期)与 `isNew`(7 天内为新)两个 helper,供首页/资源卡/文章页共用 |
| `src/components/ResourceCard.tsx` | 2026-07-06 卡片头部(分类旁)对 7 天内资源加「新」徽标(日期原本就有,未动);卡片根元素去掉 `mb-4 break-inside-avoid`(改由网格 gap 控距);2026-07-13 头部加登录用户私有的「待读/已读」徽章,悬停操作区加 ReadingStatusButtons |
| `supabase/patches/2026-07-13-reading-status.sql` + `src/hooks/use-reading-status.ts` + `src/components/ReadingStatusButtons.tsx` | 2026-07-13 阅读状态功能:`reading_status` 表(user_id+resource_id+status∈read/to_read,RLS 限本人,已并入 schema.sql 与 types.ts 手写类型);hook 提供 map 查询/upsert 变更/按状态取资源;按钮组件未登录不渲染,再点当前状态可清除。账户页 `_authenticated/account.tsx` 加「阅读进度」区(待读/已读/未读三页签,未读=全库减已标记);文章页顶栏加带文字的标记按钮 |
| `src/components/ResourceMasonry.tsx` | 2026-07-06 CSS 多列瀑布流改常规网格:多列按「先竖后横」填充导致时间倒序视觉上乱序,网格按行左→右与 published_at 倒序一致 |
| `src/routes/search.tsx` | 2026-07-06 结果列表容器同步改网格(仅 className,未碰既有类型告警行);2026-07-28 改用 strict:false 的 useSearch/useNavigate 以便 /en/search 复用组件 |
| `src/routes/resources.tsx`(SSR) | 2026-07-28 **加 `loader` 预取**:原先只有 `useQuery`,列表在客户端才渲染,服务端 HTML 正文仅 132 字符,而 AI 爬虫与部分搜索爬虫不执行 JS = 整个列表对它们不可见。加 loader 后 SSR 正文 11.7k 字符、105 个文章链接可见。**新增列表页务必带 loader** |
| `public/ai-daily/` | 2026-07-08 新增「AI 每日简报」独立静态栏目(2026-07-10 定稿为本地路线):**Cowork 定时任务每天 8:00 把深度文档写到本机 `~/Documents/AIDaily/<日期>/深度学习-<主题>-<日期>.html`**;本机 launchd `com.mingyuyang.ai-daily-deploy`(8:30/13:00/20:30,包装脚本在仓库外 `~/.ms-ai-daily-deploy.sh`)把**所有未发布日期**拷成 `public/ai-daily/<日期>.html`、往 `index.html` 的 `AI-DAILY-LIST-START` 标记下插条目(最新在上)、commit「ai-daily: 日期 主题」+ push,再 `publish.sh --deploy-only` 上线(线上探活 307 须 `-L` 跟随)。远端若有 ai-daily 内的新提交仍会 ff-only 兜底拉取;**远端提交涉及其他文件则整次跳过留人工**。2026-07-10 应用户要求**改为入 `resources` 表**:sync 脚本扫 `ai-daily/`(subcategory `daily`,标题优先 `<title>` 并去尾缀,跳过 index.html),每天部署时自动入库。2026-07-23 拆成两栏目:`ai-daily/`=**深度学习**(标签「AI 深度学习」,subcategory `daily` 标签面板显示「深度学习」),新增 `public/ai-briefing/`=**每日简报**(源 `~/Documents/AIDaily/<日>/AI每日简报-*.md`,由 `scripts/render-briefing.py` 渲染成站内风格 HTML,归档列表文字=当日头条,subcategory `briefing`,标签「AI 简报」);存量 19 天简报按真实日期回填 published_at。入口:首页分组 + 两张工具卡 + 各自归档页。日志 `~/Library/Logs/ms-ai-daily-deploy.log`。合并冲突时保留本端 |
| `scripts/render-briefing.py` | 2026-07-23 新增:AI 每日简报 Markdown → 自包含 HTML(python-markdown extra;去 md 首行 h1 作 hero 标题;外链一律新窗口;stdout 输出当日头条供归档列表);由仓库外的部署包装脚本调用 |
| `public/projects/wechat-md/index.html`、`public/ai-daily/index.html` | 2026-07-10 两个独立静态入口页 head 加 GA4 gtag 片段(同 ID `G-3GRX3Y2VQJ`)。wechat-md 的**源项目** `~/Claude 学习/wechat-md/index.html` 也已同步加(否则重新构建会冲掉);ai-daily 的每日页(`YYYY-MM-DD.html`)由 Cowork 云任务生成、暂无 GA,要统计需改云任务 prompt |
| `src/lib/data.ts` | 2026-07-05 AI 分类子分类扩充:新增 agent(智能体)、engineering(AI 工程),排序 agent/llm/engineering/notes/cv/experiment;存量文档已用 `supabase/patches/2026-07-05-ai-subcategories.sql` 重新归类;2026-07-10 新增 daily(每日简报)子分类,排在 engineering 之后 |
| `src/lib/ai-gateway.server.ts` + `classify.functions.ts` | /admin 自动分类改用 **Claude**(`@ai-sdk/anthropic`,读 `ANTHROPIC_API_KEY`) |
| `package.json` | 删 `@lovable.dev/cloud-auth-js`;**保留 `@lovable.dev/vite-tanstack-config`(这是构建工具,删了会炸)** |
| `src/components/ResourcesManager.tsx` | /admin「资料管理」:全部 5 类资料的删除/置顶(Lovable 的 ArticlesManager 只管文章);删除后核对返回行数防 RLS 假成功 |
| `src/routes/_authenticated/admin.tsx` | 仅一行改动:`ArticlesManager` 换成 `ResourcesManager`(合并冲突保留本端) |
| `supabase/patches/` | 我方 SQL 补丁(非 Lovable 迁移,一律写成幂等);用 `node scripts/run-sql.mjs --patches` 执行;已含 2026-07-02 管理员可删/改任何 resources |
| `scripts/run-sql.mjs` | 在用户 Supabase 上跑任意 SQL(Management API)。凭证 = 个人访问令牌 `sbp_...`,存仓库外 `~/.ms-supabase-token`(chmod 600);`~/.ms-supabase-admin` 的 sb_secret 只能写数据行、跑不了 SQL,别混。**有此令牌后,补丁和 Lovable 新迁移都不用再让用户去 SQL Editor 手动跑** |
| (已删除) | `src/integrations/lovable/`、`src/lib/lovable-error-reporting.ts` |
| `.env`(不入 git)/ `.gitignore` / `.env.example` | 用用户自己的 Supabase key |
| `supabase/schema.sql`、`publish.sh`、`AGENTS.md` | bootstrap / 部署脚本 / 本文件 |
| `scripts/sync-static-resources.mjs` + `scripts/resources.manifest.json` | 把 `public/` 静态 HTML 自动同步进 `resources` 表(见下) |
| `src/lib/i18n/` + `src/routes/en/` + `src/components/LanguageSwitcher.tsx` | 2026-07-28 中英双语:**URL 决定语言、SSR 阶段确定**(`/`=中文保持原 URL 不动,`/en/*`=英文)。①`lib/i18n`:`localeFromPath`/`localizedPath`、字典 `dict.ts`(只收公开界面文案,admin/auth 等自用界面保持中文)、`useT`/`useLocale`、`i18nHead`(canonical 各指各 + hreflang 自引用/双向互指/x-default;**key 必须小写 `hreflang`**,写 React 风格 `hrefLang` 会原样输出驼峰)。②路由用**显式 `routes/en/` 目录**而非 `{-$locale}` 可选参数——实测后者会让 `/任意路径` 匹配到首页,产生无限重复内容;en 路由只做薄封装,复用中文路由导出的组件与 queryOptions(为此 `articles.$slug` 组件改为接 props、`search` 改用 strict:false hook)。③`__root` 的 `<html lang>` 由 pathname 派生。④分类/子分类 `labelEn`(`catLabel(c, locale)`),工具卡 `titleEn/descEn`,资源卡对「内容语言≠界面语言」显示语言徽章。⑤**中文文章的 `/en/` 版 canonical 指回中文版**(英文外壳+中文正文属重复内容),仅原生英文内容才自成规范地址。合并冲突时保留本端 |
| `supabase/patches/2026-07-28-i18n-lang.sql` | 2026-07-28 `resources` 加 `lang`(zh/en,CHECK 约束)与 `i18n_key`(同内容多语言版本共享,唯一索引 (i18n_key,lang));`fetchTranslations()` 按 key 查另一语言版本供 hreflang 与切换用。存量 45 条每日内容已回填 key,2 篇英文内容已标 lang=en |
| `src/routes/robots[.]txt.tsx` + `src/routes/llms[.]txt.tsx` | 2026-07-28 GEO:robots 按爬虫类型分组——**放行检索类**(OAI-SearchBot/Claude-SearchBot/PerplexityBot,AI 引用走这条通道)与训练类(GPTBot/ClaudeBot,个人博客以扩大影响力为目标),屏蔽 Bytespider;注意爬虫只遵守最具体的 UA 组、不与 `*` 叠加,私有路径靠服务端鉴权而非 robots。llms.txt 为动态路由(实测该格式当前极少被抓取、Google 明确不读,做它只因零维护成本) |
| `src/lib/site.ts` + `scripts/inject-doc-seo.py` + `public/_redirects` + `src/components/ShareButton.tsx` + `public/share-card.png` + `src/routes/sitemap[.]xml.tsx` | 2026-07-27 全站 SEO/分享大修:①各路由 og:url/canonical 绝对化(OG 不认相对路径),og:image 统一静态 `share-card.png`(1024²,社交爬虫不认 SVG,原 /api/og SVG 路由弃用为 og:image 但保留);②`inject-doc-seo.py` 给 public/ 静态文档幂等注入 description/OG/canonical/JSON-LD/GA/带 16px 站标图的主页按钮(站标图=微信聊天卡片的「页面首图」),存量 94 文件已注入,管线每天对新页自动跑;③**深度文档 URL 名字化** `<日期>-<英文slug>.html`:22 篇已迁,旧地址=`_redirects` 301(Workers 静态资产原生支持,已实测)+ 占位页兜底(含 `ms-redirect-stub` 标记,sync 见标记即跳过),resources 行 slug/url 已同步迁移,未来天数由部署脚本 ASCII+拼音自动生成 slug;④sitemap 输出规范地址(站内静态文档=直链+lastmod)+ 两归档页;⑤文章页顶栏「分享」按钮(系统分享面板/复制链接)。文章页 canonical 规则:资源 url 为站内 .html 时以直链为规范地址 |

## 日常:拉 Lovable 更新并上线
```bash
./publish.sh               # 拉 main → 合 prod → 构建 → 部署 → 验证 → push GitHub,一条龙
./publish.sh --deploy-only # 只改了文档/内容、没动 Lovable
./publish.sh --schema-ok   # 已在 Supabase 跑过新迁移,允许继续部署
```
**提交/推送规则(2026-07-02 用户定)**:改动完成后**自动 commit 并 push `origin prod`**,不用再等确认(publish.sh 末尾也会自动 push)。只推 prod、普通 push、绝不 force;main 仍然只拉不推。
两个**安全停车点**:
1. **合并冲突** —— 几乎只会在 `auth.tsx` / `__root.tsx` / `package.json` / `admin.tsx`,一律**保留 prod 这边**(原生登录、去 lovable 依赖、ResourcesManager)。解完 commit,再 `--deploy-only`。
2. **新数据库迁移** —— Lovable 在 `supabase/migrations/` 新增的 `.sql`,按文件原样跑一遍(它们是 Lovable 写好的,别重抄进 schema.sql):优先 `node scripts/run-sql.mjs supabase/migrations/<新文件>.sql`(需 `~/.ms-supabase-token`,见下方文件地图);没令牌就退回 Supabase SQL Editor 手动跑。跑完用 `--schema-ok` 继续。

> `supabase/schema.sql` 只是**全新数据库的一次性 bootstrap**(幂等,整合了历史迁移)。日常更新走上面第 2 点,不要每次把新迁移再整合进它 —— 那是重复劳动。

## 加静态文档到资料库(已自动化,别再手动跑 SQL)
资料库列表读 Supabase `resources` 表,不是静态文件。以前每加一篇要手动插一行 SQL;现在 `publish.sh` 部署后会跑 `scripts/sync-static-resources.mjs` 自动同步:
- **流程**:把 HTML 放进 `public/ai-notes/`(或 `overseas/`、根目录)→ `./publish.sh --deploy-only` → 脚本扫描、按 **`folder-filename`** 约定生成 slug、`upsert`(`ignore-duplicates`,**只新增、绝不覆盖已有行**)。
- **标题/分类**:默认取文件 `<h1>`→`<title>` + 按目录给默认分类;要精修就在 `scripts/resources.manifest.json` 按 slug 覆盖 `title/summary/category/subcategory/tags`。
- **写凭证**:service_role key,只存 **仓库外 `~/.ms-supabase-admin`(chmod 600,绝不进 git、绝不打包/内联)**。缺这个文件脚本自动跳过、不阻断部署。**这是唯一能写 `resources` 的凭证**(`.env` 里的 publishable key 对该表只读;管理员登录后经 RLS 也可删/改,见 `supabase/patches/`)。
- **删静态文档**:在 /admin 资料管理里删掉库中行后,只要 HTML 还在 `public/`,下次部署会被同步脚本重新插回 —— 要么删掉 HTML 文件,要么在 `scripts/resources.manifest.json` 给该 slug 设 `"skip": true`。
- 已废弃:一次性 `supabase/seed-*.sql`(改由脚本统一管理)。
- `public/ai-daily/` 也在扫描列表内(2026-07-10 起,用户要求每日简报进资料库):subcategory `daily`、标签「AI 简报」、标题优先 `<title>`;各目录的 `index.html` 一律跳过不入库。

## 测试深度(默认最轻,省 token)
- **默认**:构建过 + `tsc --noEmit` 过 + curl `/`、`/auth`、一篇文章 = 200 + REST 探针确认相关表在。
- **动了登录 / 迁移**:再加本地 dev 跑首页 + 文章页,确认 console 干净。
- **逐个功能点击实测**:只在用户点名时做。

## 设计铁律(改任何代码都守,别破坏 Lovable 的设计)
深海军蓝主题 + 马卡龙渐变;标题 **Outfit** / 正文 **Figtree**(别换 Inter/Poppins);**禁所有 emoji,只用 Lucide 图标**;颜色一律走 `src/styles.css` 的 token,别在组件里硬编码。

## 已知 & 别做
- `src/routes/search.tsx` 有个 TanStack Router 的类型告警(`<Link search={fn}>` 签名),**运行无碍,别改** —— 改了每次 merge 多一处冲突。
- 别为改而改:能正常工作的组件不重写/重构(改 bug、加需求随时可以,记得登记文件地图)。
- 可选 key(缺了只是 /admin 对应按钮提示未配置,不影响其它):微信导入 `FIRECRAWL_API_KEY`、自动分类 `ANTHROPIC_API_KEY`。
