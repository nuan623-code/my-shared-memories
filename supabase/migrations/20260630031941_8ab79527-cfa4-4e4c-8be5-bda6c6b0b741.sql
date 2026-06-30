
-- 1. highlights table (private per-user)
CREATE TABLE public.highlights (
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

CREATE INDEX highlights_resource_user_idx ON public.highlights(resource_id, user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.highlights TO authenticated;
GRANT ALL ON public.highlights TO service_role;

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own highlights" ON public.highlights
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own highlights" ON public.highlights
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own highlights" ON public.highlights
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own highlights" ON public.highlights
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. extend comments with selection range
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS text_offset int,
  ADD COLUMN IF NOT EXISTS text_length int;
