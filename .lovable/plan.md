## 一、段落评论（核心新功能）

### 体验设计
- 文章正文每个段落（`<p>` / `<li>` / `<blockquote>`）右侧 gutter 显示一个小气泡：仅一个数字（评论数）。无评论时默认隐藏，鼠标悬停段落才出现「+」按钮。
- 点击数字 → 右侧滑出抽屉（Sheet），展示该段落的评论线程，支持回复、编辑、删除（沿用现有权限规则）。
- 顶部操作栏增加「显示/隐藏段落标注」开关，状态存 `localStorage`，默认开启。
- 未登录用户：可看数字、看评论；点「添加」时引导登录。

### 数据层
扩展现有 `comments` 表，新增字段：
- `anchor_id text null` — 段落锚点 ID（如 `p-7`，按文档顺序生成的稳定哈希）
- `anchor_text text null` — 段落前 80 字快照，用于内容变动后兜底显示
- `anchor_kind text null` — `paragraph` / `article`（旧的整篇评论 = `article`）

索引：`(resource_id, anchor_id)`。RLS 策略沿用现有规则，无需新增表，旧评论自动归入「文章评论」Tab。

### 渲染层（关键技术点）
文章 HTML 在 `iframe` 中渲染（同源 `/public`），所以可以：
1. iframe `load` 后遍历正文段落节点，按 DOM 顺序生成稳定 `data-anchor-id`（基于段落文本的短哈希，内容微调也能命中）。
2. 计算每个段落相对父容器的 `getBoundingClientRect()`，把 gutter 气泡作为**外层 React 组件**绝对定位渲染在 iframe 旁的覆盖层上（避免修改 iframe 内 DOM 的样式系统）。
3. 监听 iframe `scroll` / `resize` 重新计算位置（已有 scroll 监听，复用即可）。
4. 评论数据按 `resource_id` 一次拉取后用 `groupBy(anchor_id)` 分发。

### 文件改动
- `supabase` 迁移：`ALTER TABLE comments ADD COLUMN anchor_id / anchor_text / anchor_kind`。
- `src/components/Comments.tsx`：拆为 `<ArticleComments>`（整篇，现状）+ `<ParagraphCommentThread>`（抽屉内复用列表/表单子组件）。
- 新增 `src/components/ParagraphCommentLayer.tsx`：负责扫描 iframe、渲染 gutter 气泡、控制抽屉。
- `src/routes/articles.$slug.tsx`：挂载 `ParagraphCommentLayer`，新增「显示标注」开关。

---

## 二、页面完善计划

1. **文章页**
   - 移动端（<lg）增加可折叠的顶部目录抽屉（当前完全隐藏）。
   - iframe 高度自适应内容（同源时读取 `scrollHeight`），消除内部双滚动条。
   - 顶部操作栏加「复制链接」「上一篇/下一篇（同分类）」。

2. **资源库 `/resources`**
   - 标签筛选支持多选 + URL 同步（便于分享）。
   - 卡片增加评论数 / 收藏数小角标。
   - 空状态文案与「清空筛选」按钮。

3. **首页**
   - 顶部加「最近更新」横向滚动条。
   - 统计栏数字接真实 count（目前部分为静态）。

4. **账号 `/account`**
   - 「我的评论」Tab：展示我发的评论 + 一键跳回原文段落。
   - 头衔（title）可编辑。

5. **全站**
   - 404 页与全局 errorComponent 视觉对齐主题。
   - Header 在小屏的导航汉堡菜单。
   - 暗色模式开关（之前讨论过，留作可选项）。

---

## 三、测试计划

### 自动化（Playwright，放 `/tmp/browser/` 跑）
- **冒烟用例**：首页 → 资源库 → 打开文章 → 返回；验证 URL、关键元素、无 console error。
- **段落评论**：
  - 登录 → 点段落气泡 → 发评论 → 数字 +1 → 刷新仍在。
  - 非作者不能编辑/删除；管理员可以。
  - 关闭「显示标注」后 gutter 消失，整篇评论区不受影响。
- **导航回归**：从文章评论区点「返回资源库」不出现旧评论残留（之前已修，纳入回归）。
- **下载**：HTML / Markdown / PDF 三种格式各跑一次，校验文件名与非空。

### 手工核对清单（交付前过一遍）
- 移动端 375 / 平板 768 / 桌面 1280 三档截图。
- 未登录 vs 登录 vs 管理员三种身份各看一篇文章。
- Lighthouse：性能 / SEO / 可访问性 ≥ 90。

### 数据/安全
- 运行 `supabase--linter` 检查新字段后的 RLS。
- 手动验证：A 用户不能以 B 用户身份发段落评论（直接调 supabase-js 试）。

---

## 四、建议执行顺序
1. 段落评论：迁移 → 数据层 → gutter 层 → 抽屉 UI → 权限 → Playwright 用例。
2. 文章页移动端目录 + iframe 自适应高度。
3. 资源库筛选 + 卡片角标。
4. 账号「我的评论」。
5. 首页与零散完善。
6. 全量回归 + 截图核对 + Lighthouse。

完成第 1 步即可单独发布一次，后续按节奏推进。
