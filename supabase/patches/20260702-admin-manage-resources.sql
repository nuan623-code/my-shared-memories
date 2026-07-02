-- 2026-07-02 管理员可更新/删除任何资料(原策略只放行 owner_id 本人,
-- 脚本导入的行 owner_id 为空,谁都删不掉)。模式照抄 comments 的 has_role 写法。
-- 在 Supabase SQL Editor 原样跑一遍即可,幂等。

DROP POLICY IF EXISTS "Owners can update their resources" ON public.resources;
DROP POLICY IF EXISTS "Owners or admins update resources" ON public.resources;
CREATE POLICY "Owners or admins update resources"
  ON public.resources FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owners can delete their resources" ON public.resources;
DROP POLICY IF EXISTS "Owners or admins delete resources" ON public.resources;
CREATE POLICY "Owners or admins delete resources"
  ON public.resources FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
