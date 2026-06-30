## 目标

阅读文章时用鼠标选中任意一段文字，弹出浮动工具条，选择：
- **高亮**：仅自己可见，存到个人笔记（私密）
- **添加评论**：公开评论，所有人能看到并回复（公共讨论）

已有的"段落右侧 + 按钮"保留作为整段评论入口，二者并存。

## 用户体验

1. 在文章正文里拖动鼠标选中一段文字（最少 4 个字）。
2. 选区附近弹出浮动小工具条：`高亮` / `评论` / `取消`。
3. 点"高亮"：选区立即套上淡黄色背景；再次悬停可删除。
4. 点"评论"：右侧抽屉打开，显示被引用的原文 + 评论输入框；提交后所有人可见，可回复。
5. 重新打开文章时，自己的高亮 + 所有人的划词评论会自动重新定位高亮在原文上。

## 数据库

新增一张 `highlights` 表（私密笔记）：

| 列 | 说明 |
| --- | --- |
| `id` | uuid 主键 |
| `resource_id` | 关联文章 |
| `user_id` | 拥有者，RLS 仅本人可见 |
| `quote` | 选中的原文（最多 500 字） |
| `anchor_id` | 所在段落的稳定 hash（沿用现有 ParagraphCommentLayer 的算法） |
| `text_offset` | 选区在该段落内的起始字符偏移，便于精准还原 |
| `text_length` | 选区长度 |
| `color` | 可选高亮色（默认黄色） |
| `note` | 可选私人备注（后续可加） |
| `created_at` | 时间戳 |

RLS：`select/insert/update/delete` 全部 `using (auth.uid() = user_id)`，外人完全看不到别人的高亮。

`comments` 表已经有 `anchor_id`、`anchor_text` 字段，扩展两列：
- `text_offset int` 
- `text_length int`

新值用于划词评论（旧的"整段评论"两列留空仍兼容）。`select` 策略保持公开（任何人可读），保证讨论是公共的。

## 前端实现

新增组件 `SelectionToolbar`（套在 iframe 外层）：

1. 在 iframe 加载完成后，向其 document 监听 `mouseup`/`selectionchange`。
2. 拿到 `window.getSelection()`：
   - 用 `Range.startContainer` 向上找最近的 `p/li/blockquote/h2/h3`，复用现有 `hashAnchor(text, index)` 算 `anchor_id`。
   - 用 `range.startOffset` + 段落内文本拼接得到 `text_offset`、`text_length`、`quote`。
3. 把选区的 `getBoundingClientRect()` 转换成相对 iframe 的坐标，在 iframe 外的 overlay 上绝对定位浮动工具条（避免被 iframe sandbox 限制）。
4. 点"高亮"→ `supabase.from('highlights').insert(...)`；点"评论"→ 打开右侧抽屉，复用现有 `<Comments resourceId anchorId anchorText compact />`，新增传 `textOffset/textLength` 字段。

新增组件 `HighlightLayer`：
- 加载本人在该文章下的 `highlights`，每条根据 `anchor_id` 找到段落，按 `text_offset/length` 用 `Range.surroundContents` 把对应文字包裹进 `<mark data-highlight-id>`。
- iframe 滚动 / resize 时不需要重算（DOM 内联了），但点击 `<mark>` 显示"删除高亮"小气泡。

`ParagraphCommentLayer` 现有的右侧 + 按钮保留，给整段评论用。划词评论的小气泡用不同图标，挂在段落同一行旁边，点击打开抽屉看该选区的评论。

## 实施步骤

1. **数据库迁移**：新建 `highlights` 表 + RLS + GRANT；给 `comments` 加两列。
2. **新增 `src/lib/highlights.ts`**：CRUD + 选区计算工具。
3. **新增 `src/components/SelectionToolbar.tsx`**：iframe 选区监听 + 浮动按钮。
4. **新增 `src/components/HighlightLayer.tsx`**：渲染本人高亮 + 删除交互。
5. **改 `src/routes/articles.$slug.tsx`**：在 iframe 容器内挂载 `SelectionToolbar` 和 `HighlightLayer`，沿用现有的 `annotationsOn` 开关同步控制显隐；未登录时浮动条只显示"登录后高亮/评论"提示。
6. **改 `src/components/Comments.tsx`**：在划词评论顶部用引用样式展示 `anchor_text`，回复嵌套不变。
7. **Playwright 验证**：登录后选中一段 → 高亮 → 刷新仍在；选中另一段 → 评论 → 退出登录后用其他账号能看到该评论但看不到高亮。

## 注意事项

- iframe 是同源（`srcDoc` 或本地 `public/` HTML），可以直接读 `contentDocument`，已经在用。
- `Range.surroundContents` 在选区跨越元素时会抛错，遇到这种情况退化为只高亮第一个文本节点段，避免破坏 DOM。
- 公众号原文里图片很多，若选区只覆盖图片不弹工具条（要求至少 4 个字符）。
- 暂不实现"高亮颜色选择"和"私人备注"，先把核心闭环跑通；后续可在抽屉里加。

---

确认就开做。
