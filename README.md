# Mingyu Yang — Personal Resource Hub

个人资源库网站：记录与分享 Mingyu Yang 在 AI、软件开发、数据分析、产品实践等方向的文章、视频、链接、文件与碎片笔记。

> 由 [Lovable](https://lovable.dev) 设计搭建，后续维护可通过 GitHub 双向同步在本地用 Claude Code / Cursor / 任意编辑器接手。

## Tech Stack

- **TanStack Start v1** (React 19, Vite 7) — 文件式路由 + SSR
- **Tailwind CSS v4** — 通过 `src/styles.css` 配置主题
- **shadcn/ui + Lucide** — 无 emoji 原则，统一图标
- **Lovable Cloud (Supabase)** — Postgres + Storage + Google Auth
- **Cloudflare Workers** — 边缘部署

## Quick Start

```bash
bun install
bun run dev          # http://localhost:8080
bun run build        # 生产构建
```

需要 `.env` 中的三个变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`VITE_SUPABASE_PROJECT_ID`。

## 文档

完整的架构、设计系统、数据模型与维护指南见 [`HANDOFF.md`](./HANDOFF.md)。

## License

Personal project — All rights reserved © Mingyu Yang.
