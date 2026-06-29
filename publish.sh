#!/usr/bin/env bash
# =============================================================================
# publish.sh — one-click 维护/部署 for mingyuyang.com
# =============================================================================
# 工作模型:main = Lovable 镜像(从不手改);prod = 去 Lovable 化 + 部署叠加层。
# 本脚本把"拉 Lovable 最新 → 合进 prod → 构建 → 部署到 Cloudflare → 验证"打包成一步。
#
# 用法:
#   ./publish.sh              拉 Lovable 最新、合进 prod、构建、部署、验证(完整流程)
#   ./publish.sh --deploy-only 跳过 git,只把当前 prod 构建并部署(改了文档/内容时用)
#   ./publish.sh --schema-ok  确认已在 Supabase 跑过最新 schema.sql,允许带新迁移继续部署
#   ./publish.sh --help
#
# 前置:~/.cf_token 存着 Cloudflare API token(Workers+DNS+Pages 权限)。
# 安全停车点:合并冲突 / 检测到新 DB 迁移时,脚本会停下,等人处理后再继续。
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"

SITE="https://mingyuyang.com"
TOKEN_FILE="$HOME/.cf_token"
DEPLOY_ONLY=0
SCHEMA_OK=0

for arg in "$@"; do
  case "$arg" in
    --deploy-only) DEPLOY_ONLY=1 ;;
    --schema-ok)   SCHEMA_OK=1 ;;
    --help|-h)
      awk 'NR>1 && /^#/{sub(/^# ?/,"");print} NR>1 && !/^#/{exit}' "$0"
      exit 0 ;;
    *) echo "未知参数: $arg (试试 --help)"; exit 2 ;;
  esac
done

say()  { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
warn() { printf "\n\033[1;33m⚠ %s\033[0m\n" "$*"; }
die()  { printf "\n\033[1;31m✘ %s\033[0m\n" "$*" >&2; exit 1; }

[ -f "$TOKEN_FILE" ] || die "找不到 $TOKEN_FILE(Cloudflare API token)"

# --- 0. 干净工作区检查 -------------------------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  die "工作区有未提交改动,先 commit 或 stash 再跑(避免和合并混在一起)。"
fi

if [ "$DEPLOY_ONLY" -eq 0 ]; then
  # --- 1. 同步 main 到 Lovable 最新 ------------------------------------------
  say "拉取 Lovable 最新提交"
  git fetch origin --quiet

  git checkout --quiet main
  BEFORE_MAIN="$(git rev-parse HEAD)"
  git merge --ff-only origin/main \
    || die "main 不是快进合并 —— 说明有人手改了 main。main 必须只当 Lovable 镜像。"
  AFTER_MAIN="$(git rev-parse HEAD)"

  if [ "$BEFORE_MAIN" = "$AFTER_MAIN" ]; then
    say "main 没有新提交(Lovable 端无变化)"
  fi

  # --- 2. 合进 prod ----------------------------------------------------------
  say "把 main 合并进 prod(去 Lovable 化叠加层)"
  git checkout --quiet prod
  if ! git merge --no-edit main; then
    git merge --abort
    die "合并有冲突(通常是 auth.tsx / __root.tsx —— Lovable 又带回了它的耦合)。
    请手动解决冲突、git commit,然后用 ./publish.sh --deploy-only 继续部署。"
  fi

  # --- 3. 检测新 DB 迁移 ------------------------------------------------------
  NEW_MIGRATIONS="$(git diff --name-only --diff-filter=A "$BEFORE_MAIN" "$AFTER_MAIN" -- 'supabase/migrations/*.sql' || true)"
  if [ -n "$NEW_MIGRATIONS" ] && [ "$SCHEMA_OK" -eq 0 ]; then
    warn "检测到 Lovable 新增了数据库迁移:"
    echo "$NEW_MIGRATIONS" | sed 's/^/    + /'
    die "先把这些迁移合进 supabase/schema.sql、在 Supabase SQL Editor 跑一遍,
    确认建好新表后,再用 ./publish.sh --schema-ok 继续部署(否则新功能会因缺表报错)。"
  fi
fi

# --- 4. 依赖 + 构建 ----------------------------------------------------------
say "安装依赖(npm install)"
npm install --no-audit --no-fund

say "构建(npm run build)"
npm run build

# --- 5. 部署到 Cloudflare(带重试,proxy 偶发 fetch failed) -----------------
say "部署到 Cloudflare Workers"
n=0
until [ "$n" -ge 3 ]; do
  if CLOUDFLARE_API_TOKEN="$(cat "$TOKEN_FILE")" npx wrangler deploy; then
    break
  fi
  n=$((n+1))
  warn "部署失败(第 $n 次),5 秒后重试…"
  sleep 5
done
[ "$n" -lt 3 ] || die "部署连续失败 3 次,请检查网络/proxy。"

# --- 6. 线上验证 -------------------------------------------------------------
say "验证线上"
for path in "/" "/auth" "/articles/deepseek-r1-guide"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "$SITE$path")"
  printf "  %-32s HTTP %s\n" "$path" "$code"
  [ "$code" = "200" ] || warn "$path 不是 200,去看看。"
done

printf "\n\033[1;32m✔ 完成:%s 已更新。\033[0m\n" "$SITE"
echo "  当前分支:$(git rev-parse --abbrev-ref HEAD)(prod);main 保持 Lovable 镜像。"
