-- 双语支持:给 resources 标记语言 + 关联同一内容的不同语言版本。
-- 设计:i18n_key 相同 = 同一篇内容的不同语言版本(用于生成 hreflang 互指与语言切换)。
--       只有单语的内容 i18n_key 留空即可,不影响任何现有逻辑。
-- 幂等,可重复执行。

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'zh',
  ADD COLUMN IF NOT EXISTS i18n_key text;

-- 语言取值收敛到 zh / en(以后要加语种改这里)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_lang_check'
  ) THEN
    ALTER TABLE public.resources
      ADD CONSTRAINT resources_lang_check CHECK (lang IN ('zh', 'en'));
  END IF;
END $$;

-- 同一 i18n_key 下每种语言只能有一条
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_i18n_key_lang
  ON public.resources(i18n_key, lang) WHERE i18n_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_lang ON public.resources(lang);

COMMENT ON COLUMN public.resources.lang IS '内容语言:zh | en。默认 zh(站点存量内容以中文为主)';
COMMENT ON COLUMN public.resources.i18n_key IS '同一内容的语言版本共享此 key,用于 hreflang 互指与语言切换;单语内容留空';
