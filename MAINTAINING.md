# 维护手册 — mingyuyang.com

这个站是用 Lovable 设计、由 Claude 维护和部署的全栈应用,**不依赖 Lovable 订阅**也能继续维护。

## 分支模型

| 分支 | 作用 | 谁来改 |
|---|---|---|
| `main` | **Lovable 的镜像** —— Lovable 在网页里改设计后推到这里 | 只有 Lovable;**我们从不手改 main** |
| `prod` | `main` + 去 Lovable 化叠加层 + 部署配置 | 我们;从这里构建部署 |

`prod` 相对 `main` 多出的"去 Lovable 化"改动:
- `auth.tsx` 用原生 `supabase.auth.signInWithOAuth`(不走 Lovable 登录)
- `__root.tsx` 去掉 `reportLovableError`,站点 meta 改为本站
- 删除 `src/integrations/lovable/`、`src/lib/lovable-error-reporting.ts`
- `package.json` 去掉 `@lovable.dev/cloud-auth-js`(**保留** `@lovable.dev/vite-tanstack-config`,这是构建工具,不能删)
- `.env` 不进 git(本地保留 + `.gitignore`),用自己的 Supabase key

> 每次从 main 合并时,Lovable 往往又带回它的耦合,所以合并 `auth.tsx` 等文件时会有**固定的小冲突**,保留 prod 这边的版本即可。

## 基础设施(都是用户自己的)

- **后端**:Supabase 项目 `mrkcesmmlmuhycdisgsy`(`schema.sql` 建库;只用 publishable/anon key,靠 RLS 保护)
- **托管**:Cloudflare Workers,Worker 名 `nuan623-code-my-shared-memories`,绑定 `mingyuyang.com`
- **登录**:用户自己的 Google OAuth(Google Cloud 项目 `labubuvision`),回调到 Supabase
- Cloudflare API token 在 `~/.cf_token`

## 日常:更新上线

```bash
./publish.sh              # 拉 Lovable 最新 → 合进 prod → 构建 → 部署 → 验证
./publish.sh --deploy-only # 只改了文档/内容、没动 Lovable 时
```

脚本的两个**安全停车点**:
1. **合并冲突** → 手动解决冲突、`git commit`,再 `./publish.sh --deploy-only`。
2. **检测到新 DB 迁移** → 先把新迁移合进 `supabase/schema.sql`、在 Supabase SQL Editor 跑一遍建好新表,再 `./publish.sh --schema-ok` 继续。

## 数据库

`supabase/schema.sql` 是**幂等**的完整 schema(整合了所有迁移),可安全重复运行。Lovable 新增迁移时,把新对象并进这个文件、在 Supabase 跑一次即可。

## 待办 / 已知

- `/admin` 自动分类仍调 Lovable AI Gateway(`src/lib/ai-gateway.server.ts`)—— 之后换成 Claude API。
- 建议 revoke 早期在聊天里贴过的那个 Cloudflare token、重建。
