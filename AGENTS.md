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

## 核心原则
**Lovable 是设计 / 功能 / 数据库 schema 的唯一真理源。**
它写过的东西,直接信任、复用 —— 不复审、不重写、不"换种写法"、不重新推导。
你的职责只有两件:① 维持那层薄薄的「去 Lovable」叠加;② 把成果构建 + 部署上线。
`git merge` 进来的几十个文件原样接受,只解已知的几个冲突,其余看都不必看。

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

## 我的地图:只有这些文件是「我写的」(去 Lovable 叠加层)
**这张表之外的一切都属于 Lovable —— 只读、别翻、别改。** 要动表外文件先停下问。
| 文件 | 我做的事 |
|---|---|
| `src/routes/auth.tsx` | Google 登录用原生 `supabase.auth.signInWithOAuth`(不是 `lovable.auth`) |
| `src/routes/__root.tsx` | 去掉 `reportLovableError`,meta 改本站 |
| `src/routes/articles.$slug.tsx` | 文章 iframe **高度自适应内容**(整页滚动,不再是固定小窗口);进度条改由外层页面滚动驱动。合并冲突时保留本端自适应高度逻辑 |
| `src/routes/robots[.]txt.tsx` | sitemap 指向 `mingyuyang.com`(原指向 lovable.app) |
| `src/routes/index.tsx` | 首页改「分类分区」布局:按 lib/data 的 categories 上下分块(AI 学习在上、公众号文章在下,空分类不显示),卡片纯文字不放封面图;hero 统计卡点击滚动到分区;原类型筛选条/瀑布流已移除。合并冲突时保留本端分区布局 |
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

## 测试深度(默认最轻,省 token)
- **默认**:构建过 + `tsc --noEmit` 过 + curl `/`、`/auth`、一篇文章 = 200 + REST 探针确认相关表在。
- **动了登录 / 迁移**:再加本地 dev 跑首页 + 文章页,确认 console 干净。
- **逐个功能点击实测**:只在用户点名时做。

## 设计铁律(改任何代码都守,别破坏 Lovable 的设计)
深海军蓝主题 + 马卡龙渐变;标题 **Outfit** / 正文 **Figtree**(别换 Inter/Poppins);**禁所有 emoji,只用 Lucide 图标**;颜色一律走 `src/styles.css` 的 token,别在组件里硬编码。

## 已知 & 别做
- `src/routes/search.tsx` 有个 TanStack Router 的类型告警(`<Link search={fn}>` 签名),**运行无碍,别改** —— 改了每次 merge 多一处冲突。
- 别重写 / 重构 / "优化" Lovable 的组件。
- 可选 key(缺了只是 /admin 对应按钮提示未配置,不影响其它):微信导入 `FIRECRAWL_API_KEY`、自动分类 `ANTHROPIC_API_KEY`。
