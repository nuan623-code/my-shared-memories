## 网站新定位：Mingyu's Library

从「个人项目展示」转型为「个人资源库」——一个 Mingyu 想放什么就放什么的内容仓库。瀑布流卡片墙 + 最新资源流 + 多类型统一聚合。

---

### 一、内容类型统一为 Resource

把现有 `articles` / `projects` 数据模型合并成统一的 `Resource`，新类型一次性建好：

| type | 说明 | 示例 |
|---|---|---|
| `article` | 文章/笔记/文档（保留现有 10 篇） | AI 学习笔记 |
| `video` | 视频/音频（带封面、时长、播放链接） | 之后录的教程 |
| `link` | 外链资源卡片（自动抓标题/favicon/描述） | 收藏的工具、文章 |
| `file` | 可下载文件（PDF、PPT、资料包） | 课件、模板 |
| `note` | 简短想法/碎片笔记（纯文本，无详情页） | 一句话灵感 |

统一字段：`id, type, title, summary, cover?, tags[], category?, date, url?, fileUrl?, fileSize?, content?`

---

### 二、页面结构调整

```
/                  瀑布流最新资源流（混合所有类型）+ 顶部统计 + 标签云
/resources         同上但带筛选侧栏（类型/标签/时间）
/resources/$slug   文章/视频/文件详情页（按 type 分发渲染）
/notes             碎片笔记时间流（纯瀑布流，无详情）
/admin             新增资源（外链抓取 / 文件上传 / 写笔记） *需登录
/about             保留
/search            保留，扩展支持按类型过滤
```

删除现有 `/projects` 和 `/projects/$id` 路由（资源化后不再需要"项目"专属页）。

---

### 三、瀑布流卡片墙

- 用 CSS `columns-1 sm:columns-2 lg:columns-3 xl:columns-4` 实现真正的 Pinterest 风瀑布流，卡片高度自适应内容
- 每种 type 视觉差异化：
  - `article`：白底 + 摘要文字
  - `video`：黑底 + 封面 + 播放图标 + 时长徽章
  - `link`：网站截图/favicon + 域名小字
  - `file`：文件类型图标 + 文件大小
  - `note`：纯文本卡片 + 彩色背景（蓝/淡蓝/浅紫渐变随机）
- 顶部：类型快速筛选 chips（全部 / 文章 / 视频 / 链接 / 文件 / 笔记）

---

### 四、新能力实现

#### 1. 外链资源卡片（需开启 Lovable Cloud）
- 后端 `createServerFn` 拉取 URL 的 OG 标签（`og:title`, `og:image`, `og:description`），存进数据库
- 失败时降级到 favicon + 域名

#### 2. 文件上传与下载（需开启 Lovable Cloud + Storage）
- 创建 public bucket `resources`
- `/admin` 提供拖拽上传，存储 URL 写进数据库
- 卡片直接提供下载链接，显示大小/类型

#### 3. 简短想法/碎片笔记（需 Lovable Cloud）
- `/admin` 一个 textarea 即发即存
- 主页与 `/notes` 都展示

#### 4. 权限
- 用 Cloud 的邮箱登录，只有 Mingyu 自己登录后能看到 `/admin` 入口和发布按钮
- 访客只读浏览

---

### 五、需要确认/启用的事项

1. **启用 Lovable Cloud**：上面 3 个新能力都依赖它（数据库 + 存储 + 登录）。如果只想要瀑布流改版、不要发布后台，可以先跳过。
2. **现有数据迁移**：把 10 篇 GitHub 文章作为 seed 数据导入 Cloud 数据库；HTML 文件继续放 `public/` 目录通过 iframe 加载。
3. **删除 `/projects`**：确认可以删（目前是占位假数据）。

---

### 六、技术要点（你可以跳过）

- 数据层：`resources` 表 + `notes` 表（PostgreSQL via Cloud），公开 SELECT 给 anon，写入需 authenticated + admin role
- OG 抓取：服务端 fetch + cheerio/regex 解析
- 上传：Cloud Storage public bucket，前端用 supabase-js 上传
- 瀑布流：纯 CSS columns（无需第三方库，SSR 友好）
- 主题：保留现有深海军蓝
