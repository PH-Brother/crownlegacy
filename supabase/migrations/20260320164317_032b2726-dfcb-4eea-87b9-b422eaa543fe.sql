
-- 1. SECURITY DEFINER function to check if user is family admin
CREATE OR REPLACE FUNCTION public.is_family_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role IN ('pai', 'admin')
    AND familia_id IS NOT NULL
  );
$$;

-- 2. RPC: admin updates member name
CREATE OR REPLACE FUNCTION public.admin_update_member_name(p_member_id uuid, p_new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_familia uuid;
  v_member_familia uuid;
BEGIN
  IF NOT is_family_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem editar membros';
  END IF;

  SELECT familia_id INTO v_caller_familia FROM profiles WHERE id = auth.uid();
  SELECT familia_id INTO v_member_familia FROM profiles WHERE id = p_member_id;

  IF v_caller_familia IS NULL OR v_caller_familia IS DISTINCT FROM v_member_familia THEN
    RAISE EXCEPTION 'Membro não pertence à sua família';
  END IF;

  UPDATE profiles SET nome_completo = p_new_name, updated_at = now()
  WHERE id = p_member_id;
END;
$$;

-- 3. RPC: admin removes member from family (sets familia_id to NULL)
CREATE OR REPLACE FUNCTION public.admin_remove_family_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_familia uuid;
  v_member_familia uuid;
  v_member_role text;
  v_admin_count int;
BEGIN
  IF auth.uid() = p_member_id THEN
    RAISE EXCEPTION 'Não é possível remover a si mesmo';
  END IF;

  IF NOT is_family_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem remover membros';
  END IF;

  SELECT familia_id INTO v_caller_familia FROM profiles WHERE id = auth.uid();
  SELECT familia_id, role INTO v_member_familia, v_member_role FROM profiles WHERE id = p_member_id;

  IF v_caller_familia IS NULL OR v_caller_familia IS DISTINCT FROM v_member_familia THEN
    RAISE EXCEPTION 'Membro não pertence à sua família';
  END IF;

  IF v_member_role IN ('pai', 'admin') THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM profiles
    WHERE familia_id = v_caller_familia AND role IN ('pai', 'admin');

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador';
    END IF;
  END IF;

  UPDATE profiles SET familia_id = NULL, updated_at = now()
  WHERE id = p_member_id;
END;
$$;

-- 4. Update transacoes UPDATE policy to allow admin
DROP POLICY IF EXISTS "transacoes_update_own" ON transacoes;
CREATE POLICY "transacoes_update_own" ON transacoes
  FOR UPDATE TO authenticated
  USING (
    familia_id = public.get_user_familia_id(auth.uid())
    AND (
      usuario_id = auth.uid()
      OR public.is_family_admin(auth.uid())
    )
  )
  WITH CHECK (
    familia_id = public.get_user_familia_id(auth.uid())
    AND (
      usuario_id = auth.uid()
      OR public.is_family_admin(auth.uid())
    )
  );

-- 5. Update transacoes DELETE policy to allow admin
DROP POLICY IF EXISTS "transacoes_delete" ON transacoes;
CREATE POLICY "transacoes_delete" ON transacoes
  FOR DELETE TO authenticated
  USING (
    familia_id = public.get_user_familia_id(auth.uid())
    AND (
      usuario_id = auth.uid()
      OR public.is_family_admin(auth.uid())
    )
  );
