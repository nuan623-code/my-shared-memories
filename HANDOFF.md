# Mingyu Yang — 项目交接文档

个人资源库网站。本文档帮助 Claude Code / Cursor / 任何后续 AI 协作者快速接手维护。

---

## 一、技术栈

| 层 | 选型 |
|---|---|
| 框架 | **TanStack Start v1**（基于 React 19 + Vite 7，SSR/SSG，文件式路由） |
| 样式 | **Tailwind CSS v4**（通过 `src/styles.css` 配置，使用原生 `@import` 和 `@theme`） |
| UI 组件 | shadcn/ui + Radix + Lucide 图标（**禁止使用 emoji**） |
| 状态/数据 | TanStack Query（在 loader 中 `ensureQueryData`，组件用 `useSuspenseQuery`） |
| 后端 | **Lovable Cloud**（托管 Supabase：Postgres + Storage + Auth） |
| 部署 | Cloudflare Workers（边缘运行时） |
| 字体 | `@fontsource-variable/figtree`（正文）+ `@fontsource-variable/outfit`（标题） |

---

## 二、目录结构

```
src/
├── routes/                 # 文件式路由（自动生成 routeTree.gen.ts，勿改）
│   ├── __root.tsx          # 根布局：HTML shell、Header、Footer
│   ├── index.tsx           # 首页 - 最新资源流（瀑布流）
│   ├── resources.tsx       # 资源列表
│   ├── resources.$slug.tsx # 资源详情
│   ├── articles.tsx        # 文章列表
│   ├── articles.$slug.tsx  # 文章详情（iframe + 目录 + 进度条）
│   ├── notes.tsx           # 碎片笔记流
│   ├── search.tsx          # 全站搜索（带高亮、防抖、键盘导航）
│   ├── about.tsx
│   ├── auth.tsx            # Google 登录
│   └── _authenticated/
│       └── account.tsx     # 个人中心 + 我的书架
├── components/
│   ├── Header.tsx          # 顶部导航（含搜索/账号入口）
│   ├── Footer.tsx
│   ├── ResourceCard.tsx    # 通用资源卡片（5 种类型）
│   ├── ResourceMasonry.tsx # Pinterest 风格瀑布流容器
│   ├── FavoriteButton.tsx  # 书签收藏按钮
│   └── ui/                 # shadcn 组件
├── hooks/
│   └── use-favorites.ts    # 收藏读取/切换（React Query）
├── lib/
│   ├── resources.ts        # Resource 接口 + Supabase 查询
│   └── data.ts             # 分类常量
├── integrations/supabase/  # 自动生成，禁止手改
└── styles.css              # Tailwind v4 主题（深海军蓝）
public/                     # 静态资源（含已下载的 HTML 文章）
```

---

## 三、设计系统

**风格**：深海军蓝主题 + 马卡龙辅色渐变，无 emoji，一律使用 Lucide 图标。

**核心 Token**（定义于 `src/styles.css`）：
- 主色：`--primary` ≈ oklch(0.48 ...) 深海军蓝
- 背景：极浅蓝 `#F0F7FF` 系
- 卡片：纯白，16px 圆角，微弱阴影，顶部彩色渐变条区分分类
- 导航：毛玻璃效果

**字体**：标题 Outfit，正文 Figtree。**永远不要替换成 Inter / Poppins**。

**绝对禁止**：
- 任何 emoji（💡 ✨ 🚀 等）
- 在组件里硬编码颜色（`text-white`, `bg-[#xxx]`），一律走 token
- 使用紫色/靛蓝渐变 + 白底的 AI 通用美学

---

## 四、数据模型（Lovable Cloud / Supabase）

### `resources` 表
统一资源容器，支持 5 种 `type`：`article` | `video` | `link` | `file` | `note`
```
id uuid, slug text, type text, title text, description text,
content text, url text, file_path text, video_url text,
category text, subcategory text, tags text[],
cover_image text, created_at timestamptz, updated_at timestamptz,
user_id uuid
```

### `favorites` 表
```
id uuid, user_id uuid, resource_id uuid, created_at timestamptz
unique(user_id, resource_id)
```

**所有表都启用了 RLS** 并 `GRANT` 给 `authenticated` / `service_role`。
详见 `supabase/migrations/`。

---

## 五、环境变量

`.env`（GitHub 同步会带过去）：
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

只要这三个变量在，本地就能直连现有的 Lovable Cloud 后端，数据/登录用户/已上传文件全部可用。

---

## 六、本地启动

```bash
git clone https://github.com/nuan623-code/my-shared-memories.git
cd my-shared-memories
bun install
bun run dev          # http://localhost:8080
```

构建检查：`bun run build`
类型检查：`bunx tsgo --noEmit`（**不要用 tsc**）

---

## 七、常见维护任务

### 加一篇新文章
1. HTML 文件放进 `public/articles/<slug>.html`
2. 在 `/admin` 后台或直接 SQL insert 一条 `resources` 记录（type=`article`，url 指向 HTML 路径）

### 加一种新资源类型
1. 扩展 `src/lib/resources.ts` 的 `ResourceType` 联合
2. 在 `ResourceCard.tsx` 加对应的渲染分支与配色
3. 在 `/admin` 表单加输入字段

### 改主题色
只改 `src/styles.css` 里的 `@theme` 块 token。**不要去组件里 grep 替换颜色**。

### 加新页面
在 `src/routes/` 新建文件（如 `playground.tsx` → `/playground`），TanStack Router 自动注册。
必须设置 `head()` 写 title / description / og:* / twitter:*。

### 路由规则速记
- 公开路由的 `loader` **不能**调用带 `requireSupabaseAuth` 的 server function（SSR 会 401）
- 需要登录的页面放 `src/routes/_authenticated/` 下
- 不要在 `src/routes/` 里建 `_app/index.tsx` 之类的 Next.js 风目录

---

## 八、不要碰的文件

- `src/routeTree.gen.ts`（自动生成）
- `src/integrations/supabase/client.ts` / `client.server.ts` / `types.ts` / `auth-middleware.ts` / `auth-attacher.ts`
- `.env` 里的三个 `VITE_SUPABASE_*` 变量
- `supabase/config.toml`

---

## 九、当前已实现的功能清单

- [x] 首页瀑布流（按类型筛选 + 最新资源流）
- [x] 5 种资源类型卡片（article / video / link / file / note）
- [x] 文章详情：iframe + 自动目录 + 锚点跳转 + 滚动进度条 + SEO/OG meta + JSON-LD
- [x] 全站搜索：高亮 + 防抖 + 加载/错误态 + 键盘导航 + Tab 焦点循环 + 无结果推荐
- [x] Google 登录 + 个人中心
- [x] 收藏（书架）系统
- [x] 深海军蓝主题 + 马卡龙渐变 + 响应式

后续可扩展方向：管理后台权限分级、视频播放器组件、RSS 订阅、评论系统。
