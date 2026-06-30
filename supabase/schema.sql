-- =============================================================================
-- Mingyu's Library — canonical schema (idempotent / safe to re-run)
-- =============================================================================
-- Run this in your own Supabase project's SQL Editor.
-- It reconciles the DB to the schema the current app code expects:
--   tables : resources, favorites, profiles, comments, user_roles
--   types  : app_role
--   funcs  : set_updated_at, handle_new_user, has_role
--   + RLS policies, triggers, indexes, storage policies, article seed
-- Everything is guarded (IF NOT EXISTS / DROP..CREATE / CREATE OR REPLACE),
-- so running it on a DB that already has resources+favorites is harmless.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared trigger function: bump updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
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

-- reconcile columns in case an older resources table predates some of them
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS content    TEXT,
  ADD COLUMN IF NOT EXISTS url        TEXT,
  ADD COLUMN IF NOT EXISTS file_url   TEXT,
  ADD COLUMN IF NOT EXISTS file_size  BIGINT,
  ADD COLUMN IF NOT EXISTS file_type  TEXT,
  ADD COLUMN IF NOT EXISTS cover_url  TEXT,
  ADD COLUMN IF NOT EXISTS category   TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS duration   TEXT,
  ADD COLUMN IF NOT EXISTS owner_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_published_at ON public.resources(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON public.resources USING GIN(tags);

GRANT SELECT ON public.resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resources are readable by everyone" ON public.resources;
CREATE POLICY "Resources are readable by everyone"
  ON public.resources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create their own resources" ON public.resources;
CREATE POLICY "Authenticated users can create their own resources"
  ON public.resources FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their resources" ON public.resources;
CREATE POLICY "Owners can update their resources"
  ON public.resources FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their resources" ON public.resources;
CREATE POLICY "Owners can delete their resources"
  ON public.resources FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS resources_updated_at ON public.resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.favorites;
CREATE POLICY "Users can add their own favorites" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their own favorites" ON public.favorites;
CREATE POLICY "Users can remove their own favorites" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- roles: app_role enum + user_roles + has_role()
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles + auto-create-on-signup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '匿名读者',
  title TEXT NOT NULL DEFAULT '读者',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles readable by all" ON public.profiles;
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, title)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), '匿名读者'),
    '读者'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- backfill profiles for any existing users
INSERT INTO public.profiles (id, display_name, title)
SELECT id, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), '匿名读者'), '读者'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- comments (threaded replies + paragraph anchors)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS anchor_id text,
  ADD COLUMN IF NOT EXISTS anchor_text text,
  ADD COLUMN IF NOT EXISTS anchor_kind text NOT NULL DEFAULT 'article';

GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- final policy set (owner OR admin for update/delete)
DROP POLICY IF EXISTS "Comments readable by all" ON public.comments;
CREATE POLICY "Comments readable by all" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert own comments" ON public.comments;
CREATE POLICY "Users insert own comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- drop any earlier owner-only variants before creating the owner-or-admin ones
DROP POLICY IF EXISTS "Users update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Users or admins update comments" ON public.comments;
CREATE POLICY "Users or admins update comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users or admins delete comments" ON public.comments;
CREATE POLICY "Users or admins delete comments" ON public.comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS comments_resource_idx ON public.comments(resource_id, created_at);
CREATE INDEX IF NOT EXISTS comments_resource_anchor_idx ON public.comments(resource_id, anchor_id);

DROP TRIGGER IF EXISTS comments_updated_at ON public.comments;
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2026-06-30 Lovable 批次:头像/唯一昵称、浏览量、点赞、置顶、全文搜索、
--   邮件订阅、站内通知(+评论通知触发器)、划词高亮、评论选区。
--   (整合自 supabase/migrations 的 5 个迁移,全部做成幂等可重复运行。)
-- ---------------------------------------------------------------------------

-- profiles:头像预设 + 唯一昵称
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_preset text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_display_name_unique') THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'profiles_display_name_unique 跳过:存在重复 display_name,请先去重后再重跑本脚本';
    END;
  END IF;
END $$;

-- 文章浏览量
CREATE TABLE IF NOT EXISTS public.article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  viewer_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS article_views_resource_idx ON public.article_views(resource_id, viewed_at DESC);
GRANT SELECT, INSERT ON public.article_views TO anon, authenticated;
GRANT ALL ON public.article_views TO service_role;
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "views insert anyone" ON public.article_views;
CREATE POLICY "views insert anyone" ON public.article_views FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "views select anyone" ON public.article_views;
CREATE POLICY "views select anyone" ON public.article_views FOR SELECT TO anon, authenticated USING (true);

-- 文章点赞(支持匿名指纹)
CREATE TABLE IF NOT EXISTS public.article_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  liker_id uuid,
  fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS article_likes_user_uniq
  ON public.article_likes(resource_id, liker_id) WHERE liker_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS article_likes_fp_uniq
  ON public.article_likes(resource_id, fingerprint) WHERE liker_id IS NULL AND fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS article_likes_resource_idx ON public.article_likes(resource_id);
GRANT SELECT, INSERT, DELETE ON public.article_likes TO anon, authenticated;
GRANT ALL ON public.article_likes TO service_role;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes select anyone" ON public.article_likes;
CREATE POLICY "likes select anyone" ON public.article_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "likes insert anyone" ON public.article_likes;
CREATE POLICY "likes insert anyone" ON public.article_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "likes delete self" ON public.article_likes;
CREATE POLICY "likes delete self" ON public.article_likes FOR DELETE TO anon, authenticated
  USING ((liker_id IS NOT NULL AND liker_id = auth.uid()) OR liker_id IS NULL);

-- 资源:置顶
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS resources_pinned_idx ON public.resources(pinned) WHERE pinned = true;

-- 资源:全文搜索(用触发器维护 tsvector,避免生成列的 immutable 报错)
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS search_tsv tsvector;
CREATE OR REPLACE FUNCTION public.resources_update_search_tsv()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv := to_tsvector('simple',
    coalesce(NEW.title,'') || ' ' ||
    coalesce(NEW.summary,'') || ' ' ||
    coalesce(NEW.content,'') || ' ' ||
    coalesce(array_to_string(NEW.tags,' '),''));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_resources_search_tsv ON public.resources;
CREATE TRIGGER trg_resources_search_tsv BEFORE INSERT OR UPDATE OF title, summary, content, tags
  ON public.resources FOR EACH ROW EXECUTE FUNCTION public.resources_update_search_tsv();
CREATE INDEX IF NOT EXISTS resources_search_tsv_idx ON public.resources USING gin(search_tsv);
-- 回填:仅未填充的行,避免重复运行时反复 bump updated_at
UPDATE public.resources SET title = title WHERE search_tsv IS NULL;

-- 邮件订阅
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.subscribers TO anon, authenticated;
GRANT ALL ON public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subs select self" ON public.subscribers;
CREATE POLICY "subs select self" ON public.subscribers FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "subs select admin" ON public.subscribers;
CREATE POLICY "subs select admin" ON public.subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "subs insert anyone" ON public.subscribers;
CREATE POLICY "subs insert anyone" ON public.subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 站内通知
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  url text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, read, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif select self" ON public.notifications;
CREATE POLICY "notif select self" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notif update self" ON public.notifications;
CREATE POLICY "notif update self" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notif delete self" ON public.notifications;
CREATE POLICY "notif delete self" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 评论触发通知(回复作者 + 内容作者)
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  res_owner uuid;
  res_title text;
  res_slug text;
  res_type text;
  parent_author uuid;
  link_url text;
BEGIN
  SELECT owner_id, title, slug, type INTO res_owner, res_title, res_slug, res_type
  FROM public.resources WHERE id = NEW.resource_id;
  link_url := CASE WHEN res_type = 'article' THEN '/articles/' || coalesce(res_slug, NEW.resource_id::text)
                   ELSE '/notes' END;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM public.comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO public.notifications(user_id, type, title, body, url)
      VALUES (parent_author, 'reply', '有人回复了你的评论', left(NEW.content, 80), link_url);
    END IF;
  END IF;
  IF res_owner IS NOT NULL AND res_owner <> NEW.user_id
     AND (parent_author IS NULL OR parent_author <> res_owner) THEN
    INSERT INTO public.notifications(user_id, type, title, body, url)
    VALUES (res_owner, 'comment', '有人评论了《' || coalesce(res_title,'内容') || '》', left(NEW.content, 80), link_url);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- 收紧:这两个函数仅供触发器调用,不开放直接执行
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resources_update_search_tsv() FROM PUBLIC, anon, authenticated;

-- 划词高亮(每用户私有)
CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anchor_id text NOT NULL,
  quote text NOT NULL,
  text_offset int NOT NULL DEFAULT 0,
  text_length int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'yellow',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS highlights_resource_user_idx ON public.highlights(resource_id, user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.highlights TO authenticated;
GRANT ALL ON public.highlights TO service_role;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own highlights" ON public.highlights;
CREATE POLICY "Users read own highlights" ON public.highlights
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own highlights" ON public.highlights;
CREATE POLICY "Users insert own highlights" ON public.highlights
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own highlights" ON public.highlights;
CREATE POLICY "Users update own highlights" ON public.highlights
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own highlights" ON public.highlights;
CREATE POLICY "Users delete own highlights" ON public.highlights
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 评论:选区范围(用于划词评论)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS text_offset int,
  ADD COLUMN IF NOT EXISTS text_length int;

-- ---------------------------------------------------------------------------
-- storage policies for the public 'resources' bucket
-- (create the bucket in the Storage UI if it does not exist yet)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read resources bucket" ON storage.objects;
CREATE POLICY "Public can read resources bucket"
  ON storage.objects FOR SELECT USING (bucket_id = 'resources');

DROP POLICY IF EXISTS "Authenticated users can upload to resources" ON storage.objects;
CREATE POLICY "Authenticated users can upload to resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can update their files in resources" ON storage.objects;
CREATE POLICY "Owners can update their files in resources"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their files in resources" ON storage.objects;
CREATE POLICY "Owners can delete their files in resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND owner = auth.uid());

-- ---------------------------------------------------------------------------
-- seed the 10 base articles (skipped if slug already present)
-- ---------------------------------------------------------------------------
INSERT INTO public.resources (slug, type, title, summary, category, subcategory, tags, url) VALUES
  ('deepseek-r1-guide','article','DeepSeek-R1：深度求索的推理模型进化之路','DeepSeek-R1 模型解读','ai','llm',ARRAY['AI','大模型','DeepSeek'],'/deepseek-r1-guide.html'),
  ('prompt-engineering-roundtable','article','Anthropic提示工程圆桌会议:Prompt Engineering Roundtable','Anthropic 提示工程圆桌','ai','notes',ARRAY['AI','Prompt Engineering','Claude'],'/prompt-engineering-roundtable.html'),
  ('ai-notes-cs146s-week1','article','CS146S第一周:Introduction to Building and Evaluating Large Language Model Applications','CS146S Week1 笔记','ai','notes',ARRAY['AI','课程','LLM应用'],'/ai-notes/cs146s-week1.html'),
  ('ai-notes-llm-guide','article','大语言模型完全指南:从入门到实战','大语言模型完全指南','ai','llm',ARRAY['AI','大模型','指南'],'/ai-notes/llm-guide.html'),
  ('ai-notes-llm-deep-dive','article','深入理解大语言模型:架构、训练与推理','深入理解 LLM','ai','llm',ARRAY['AI','大模型','架构'],'/ai-notes/llm-deep-dive.html'),
  ('ai-notes-claude-dev-handbook','article','Claude开发者手册:从API到应用开发','Claude 开发者手册','ai','practice',ARRAY['AI','Claude','API'],'/ai-notes/claude-dev-handbook.html'),
  ('ai-notes-claude-arch','article','Claude产品架构解析:从设计到部署','Claude 产品架构解析','ai','practice',ARRAY['AI','Claude','产品架构'],'/ai-notes/claude-arch.html'),
  ('overseas-oddl-training','article','ODDL内部培训:移动广告归因与数据对接','ODDL 培训笔记','article','industry',ARRAY['移动广告','ODDL','归因'],'/overseas/oddl-training.html'),
  ('overseas-adjust-data-discrepancy','article','Adjust数据差异排查指南:从日志到归因','Adjust 数据排查指南','article','industry',ARRAY['移动广告','Adjust','数据排查'],'/overseas/adjust-data-discrepancy.html'),
  ('overseas-adjust-oddl','article','Adjust ODDL:海外广告投放与数据监控','Adjust ODDL 海外投放','article','industry',ARRAY['移动广告','Adjust','ODDL'],'/overseas/adjust-oddl.html')
ON CONFLICT (slug) DO NOTHING;
