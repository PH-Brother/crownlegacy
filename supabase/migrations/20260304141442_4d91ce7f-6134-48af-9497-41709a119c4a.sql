
-- Fix infinite recursion in profiles_select by using SECURITY DEFINER function
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      familia_id IS NOT NULL
      AND familia_id = public.get_user_familia_id(auth.uid())
    )
  );

-- Fix infinite recursion in profiles_update_safe
DROP POLICY IF EXISTS "profiles_update_safe" ON public.profiles;
CREATE POLICY "profiles_update_safe" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND familia_id IS NOT DISTINCT FROM (SELECT p.familia_id FROM public.profiles p WHERE p.id = auth.uid())
    AND pontos_total IS NOT DISTINCT FROM (SELECT p.pontos_total FROM public.profiles p WHERE p.id = auth.uid())
    AND nivel_gamificacao IS NOT DISTINCT FROM (SELECT p.nivel_gamificacao FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Fix familias_select to use SECURITY DEFINER function
DROP POLICY IF EXISTS "familias_select" ON public.familias;
CREATE POLICY "familias_select" ON public.familias
  FOR SELECT TO authenticated
  USING (id = public.get_user_familia_id(auth.uid()));

-- Fix familias_update to use SECURITY DEFINER function  
DROP POLICY IF EXISTS "familias_update" ON public.familias;
CREATE POLICY "familias_update" ON public.familias
  FOR UPDATE TO authenticated
  USING (id = public.get_user_familia_id(auth.uid()));

-- Fix transacoes policies that reference profiles
DROP POLICY IF EXISTS "transacoes_select" ON public.transacoes;
CREATE POLICY "transacoes_select" ON public.transacoes
  FOR SELECT TO authenticated
  USING (familia_id = public.get_user_familia_id(auth.uid()));

DROP POLICY IF EXISTS "transacoes_insert" ON public.transacoes;
CREATE POLICY "transacoes_insert" ON public.transacoes
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND familia_id = public.get_user_familia_id(auth.uid()));

DROP POLICY IF EXISTS "transacoes_delete" ON public.transacoes;
CREATE POLICY "transacoes_delete" ON public.transacoes
  FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() AND familia_id = public.get_user_familia_id(auth.uid()));
