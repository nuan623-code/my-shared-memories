
-- Article views
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
CREATE POLICY "views insert anyone" ON public.article_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "views select anyone" ON public.article_views FOR SELECT TO anon, authenticated USING (true);

-- Article likes
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
CREATE POLICY "likes select anyone" ON public.article_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "likes insert anyone" ON public.article_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "likes delete self" ON public.article_likes FOR DELETE TO anon, authenticated
  USING ((liker_id IS NOT NULL AND liker_id = auth.uid()) OR liker_id IS NULL);

-- Pin
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS resources_pinned_idx ON public.resources(pinned) WHERE pinned = true;

-- FTS via trigger (avoids immutable-expression error on generated column)
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
UPDATE public.resources SET title = title; -- backfill
CREATE INDEX IF NOT EXISTS resources_search_tsv_idx ON public.resources USING gin(search_tsv);

-- Subscribers
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
CREATE POLICY "subs select self" ON public.subscribers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "subs select admin" ON public.subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "subs insert anyone" ON public.subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Notifications
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
CREATE POLICY "notif select self" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update self" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif delete self" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comment notification trigger
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
