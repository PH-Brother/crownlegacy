
-- Drop the overly restrictive profiles_update_safe policy
-- It blocks familia_id and role changes needed during onboarding
DROP POLICY IF EXISTS "profiles_update_safe" ON public.profiles;

-- Recreate with relaxed rules:
-- Allow familia_id to be set when current value is NULL (onboarding)
-- Allow role changes (pai/mae/filho/responsavel - not security-critical)
-- Still block pontos_total and nivel_gamificacao changes (must use RPC)
CREATE POLICY "profiles_update_safe" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      -- familia_id: allow setting when currently NULL, block changing to different family
      familia_id IS NOT DISTINCT FROM (SELECT p.familia_id FROM profiles p WHERE p.id = auth.uid())
      OR (SELECT p.familia_id FROM profiles p WHERE p.id = auth.uid()) IS NULL
    )
    AND NOT (pontos_total IS DISTINCT FROM (SELECT p.pontos_total FROM profiles p WHERE p.id = auth.uid()))
    AND NOT (nivel_gamificacao IS DISTINCT FROM (SELECT p.nivel_gamificacao FROM profiles p WHERE p.id = auth.uid()))
  );

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
