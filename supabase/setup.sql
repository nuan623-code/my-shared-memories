-- ============================================================
-- my-shared-memories —— 在你自己的 Supabase 项目里一次性建库脚本
-- 用法:Supabase Dashboard → SQL Editor → New query → 粘贴全部 → Run
-- 复刻自 supabase/migrations/ 的 3 个文件 + 10 篇文章 seed
-- ============================================================

-- ---------- 1. resources 表 ----------
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('article','video','link','file','note')),
  title TEXT,
  summary TEXT,
  content TEXT,
  url TEXT,
  file_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  cover_url TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  duration TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_type ON public.resources(type);
CREATE INDEX idx_resources_published_at ON public.resources(published_at DESC);
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags);

GRANT SELECT ON public.resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resources are readable by everyone"
  ON public.resources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create their own resources"
  ON public.resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their resources"
  ON public.resources FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their resources"
  ON public.resources FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- 2. 10 篇文章 seed ----------
INSERT INTO public.resources (slug, type, title, summary, category, subcategory, tags, url) VALUES
  ('deepseek-r1-guide','article','DeepSeek-R1：深度求索的推理模型进化之路','DeepSeek-R1 模型解读','ai','llm',ARRAY['AI','大模型','DeepSeek'],'/deepseek-r1-guide.html'),
  ('prompt-engineering-roundtable','article','Anthropic提示工程圆桌会议：Prompt Engineering Roundtable','Anthropic 提示工程圆桌','ai','notes',ARRAY['AI','Prompt Engineering','Claude'],'/prompt-engineering-roundtable.html'),
  ('ai-notes-cs146s-week1','article','CS146S第一周：Introduction to Building and Evaluating Large Language Model Applications','CS146S Week1 笔记','ai','notes',ARRAY['AI','课程','LLM应用'],'/ai-notes/cs146s-week1.html'),
  ('ai-notes-llm-guide','article','大语言模型完全指南：从入门到实战','大语言模型完全指南','ai','llm',ARRAY['AI','大模型','指南'],'/ai-notes/llm-guide.html'),
  ('ai-notes-llm-deep-dive','article','深入理解大语言模型：架构、训练与推理','深入理解 LLM','ai','llm',ARRAY['AI','大模型','架构'],'/ai-notes/llm-deep-dive.html'),
  ('ai-notes-claude-dev-handbook','article','Claude开发者手册：从API到应用开发','Claude 开发者手册','ai','practice',ARRAY['AI','Claude','API'],'/ai-notes/claude-dev-handbook.html'),
  ('ai-notes-claude-arch','article','Claude产品架构解析：从设计到部署','Claude 产品架构解析','ai','practice',ARRAY['AI','Claude','产品架构'],'/ai-notes/claude-arch.html'),
  ('overseas-oddl-training','article','ODDL内部培训：移动广告归因与数据对接','ODDL 培训笔记','article','industry',ARRAY['移动广告','ODDL','归因'],'/overseas/oddl-training.html'),
  ('overseas-adjust-data-discrepancy','article','Adjust数据差异排查指南：从日志到归因','Adjust 数据排查指南','article','industry',ARRAY['移动广告','Adjust','数据排查'],'/overseas/adjust-data-discrepancy.html'),
  ('overseas-adjust-oddl','article','Adjust ODDL：海外广告投放与数据监控','Adjust ODDL 海外投放','article','industry',ARRAY['移动广告','Adjust','ODDL'],'/overseas/adjust-oddl.html');

-- ---------- 3. favorites 表(收藏书架) ----------
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own favorites" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own favorites" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_favorites_user ON public.favorites(user_id, created_at DESC);

-- ---------- 4. 存储桶 resources(以后上传文件/封面用,现在没文件可空着) ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources','resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read resources bucket"
  ON storage.objects FOR SELECT USING (bucket_id = 'resources');
CREATE POLICY "Authenticated users can upload to resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND owner = auth.uid());
CREATE POLICY "Owners can update their files in resources"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND owner = auth.uid());
CREATE POLICY "Owners can delete their files in resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND owner = auth.uid());
