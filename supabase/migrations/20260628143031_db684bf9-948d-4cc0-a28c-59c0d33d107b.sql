
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS anchor_id text,
  ADD COLUMN IF NOT EXISTS anchor_text text,
  ADD COLUMN IF NOT EXISTS anchor_kind text NOT NULL DEFAULT 'article';

CREATE INDEX IF NOT EXISTS comments_resource_anchor_idx
  ON public.comments (resource_id, anchor_id);
