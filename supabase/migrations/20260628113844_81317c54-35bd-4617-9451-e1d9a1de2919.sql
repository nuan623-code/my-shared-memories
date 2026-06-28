
-- Unified resources table for Mingyu's library
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

-- anyone can read
CREATE POLICY "Resources are readable by everyone"
  ON public.resources FOR SELECT
  USING (true);

-- authenticated users can insert as themselves
CREATE POLICY "Authenticated users can create their own resources"
  ON public.resources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- authenticated users can update/delete their own
CREATE POLICY "Owners can update their resources"
  ON public.resources FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their resources"
  ON public.resources FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- updated_at trigger
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

-- Seed existing 10 articles
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
