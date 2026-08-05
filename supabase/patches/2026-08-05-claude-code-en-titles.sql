-- 2026-08-05 订正:英文版首批入库时标题带了「 · Claude Code Learning Hub」尾缀
-- (sync 的 cleanTitle 当时只剥中文尾缀,现已修)。幂等:只处理仍带尾缀的行。
UPDATE public.resources
SET title = regexp_replace(title, '\s*·\s*Claude Code Learning Hub$', '')
WHERE slug LIKE 'en-claude-code-%'
  AND title LIKE '%· Claude Code Learning Hub';
