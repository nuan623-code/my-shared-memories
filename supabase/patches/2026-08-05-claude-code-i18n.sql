-- 2026-08-05 Claude Code 学习站双语配对:
-- 中文行(claude-code-*)回填 i18n_key = slug,与英文行(en-claude-code-*,由 sync 脚本
-- keyFromBase 逻辑写入同一 key)共享,供 hreflang 与语言切换。幂等:只补 NULL。
UPDATE public.resources
SET i18n_key = slug
WHERE slug LIKE 'claude-code-%'
  AND i18n_key IS NULL;
