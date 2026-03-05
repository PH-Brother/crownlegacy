
-- Drop all RESTRICTIVE policies on documentos
DROP POLICY IF EXISTS "documentos_select_own" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert_own" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update_own" ON public.documentos;
DROP POLICY IF EXISTS "documentos_delete_own" ON public.documentos;

-- Recreate as PERMISSIVE policies
CREATE POLICY "documentos_select_own" ON public.documentos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "documentos_insert_own" ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "documentos_update_own" ON public.documentos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "documentos_delete_own" ON public.documentos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
