-- Fix profiles SELECT policy to restrict to same family
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR
    familia_id = public.get_user_familia_id()
  );

-- Fix transacoes UPDATE policy to also check familia_id
DROP POLICY IF EXISTS "transacoes_update" ON public.transacoes;
CREATE POLICY "transacoes_update" ON public.transacoes
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    AND familia_id = public.get_user_familia_id()
  );

-- Make avatars bucket private
UPDATE storage.buckets SET public = false WHERE id = 'avatars';