-- 阅读状态:登录用户对每篇资源的私有标记(待读 / 已读),RLS 限本人可见可写。
-- 幂等,可重复执行。

CREATE TABLE IF NOT EXISTS public.reading_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('read', 'to_read')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_status TO authenticated;
GRANT ALL ON public.reading_status TO service_role;

ALTER TABLE public.reading_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reading status" ON public.reading_status;
CREATE POLICY "Users can view their own reading status" ON public.reading_status
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can add their own reading status" ON public.reading_status;
CREATE POLICY "Users can add their own reading status" ON public.reading_status
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own reading status" ON public.reading_status;
CREATE POLICY "Users can update their own reading status" ON public.reading_status
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their own reading status" ON public.reading_status;
CREATE POLICY "Users can remove their own reading status" ON public.reading_status
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reading_status_user ON public.reading_status(user_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_reading_status_updated_at ON public.reading_status;
CREATE TRIGGER trg_reading_status_updated_at
  BEFORE UPDATE ON public.reading_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
