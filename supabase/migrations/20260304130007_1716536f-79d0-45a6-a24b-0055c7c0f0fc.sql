
-- Drop and recreate profiles_select with SECURITY DEFINER function to prevent manipulation
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

-- Drop and recreate familias_select using SECURITY DEFINER function
DROP POLICY IF EXISTS "familias_select" ON public.familias;
CREATE POLICY "familias_select" ON public.familias
  FOR SELECT TO authenticated
  USING (
    id = public.get_user_familia_id(auth.uid())
  );
