
-- =============================================
-- SECURITY DEFINER functions for safe profile mutations
-- =============================================

-- 1. Create family with admin role
CREATE OR REPLACE FUNCTION public.create_family_with_admin(
  p_nome text,
  p_codigo_convite text
)
RETURNS TABLE(id uuid, nome text, codigo_convite text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_familia_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.familia_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a family';
  END IF;
  
  INSERT INTO familias (nome, codigo_convite, plano, data_inicio_plano, data_fim_trial, limite_usuarios)
  VALUES (p_nome, p_codigo_convite, 'trial', NOW(), NOW() + INTERVAL '7 days', 5)
  RETURNING familias.id INTO v_familia_id;
  
  UPDATE profiles
  SET familia_id = v_familia_id, role = 'admin'
  WHERE profiles.id = auth.uid();
  
  RETURN QUERY
  SELECT familias.id, familias.nome, familias.codigo_convite
  FROM familias WHERE familias.id = v_familia_id;
END;
$$;

-- 2. Join family with invite code
CREATE OR REPLACE FUNCTION public.join_family_with_code(
  p_codigo_convite text
)
RETURNS TABLE(id uuid, nome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_familia_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.familia_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a family';
  END IF;
  
  SELECT familias.id INTO v_familia_id
  FROM familias WHERE familias.codigo_convite = p_codigo_convite;
  
  IF v_familia_id IS NULL THEN
    RAISE EXCEPTION 'Invalid family code';
  END IF;
  
  UPDATE profiles
  SET familia_id = v_familia_id, role = 'membro'
  WHERE profiles.id = auth.uid();
  
  RETURN QUERY
  SELECT familias.id, familias.nome
  FROM familias WHERE familias.id = v_familia_id;
END;
$$;

-- 3. Add gamification points safely
CREATE OR REPLACE FUNCTION public.add_gamification_points(
  p_pontos integer,
  p_tipo_evento text,
  p_descricao text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points integer;
  v_new_points integer;
  v_new_level integer;
BEGIN
  SELECT pontos_total INTO v_current_points
  FROM profiles WHERE profiles.id = auth.uid();
  
  v_new_points := GREATEST(0, COALESCE(v_current_points, 0) + p_pontos);
  
  v_new_level := CASE
    WHEN v_new_points >= 4000 THEN 5
    WHEN v_new_points >= 2000 THEN 4
    WHEN v_new_points >= 1000 THEN 3
    WHEN v_new_points >= 500 THEN 2
    ELSE 1
  END;
  
  UPDATE profiles
  SET pontos_total = v_new_points, nivel_gamificacao = v_new_level
  WHERE profiles.id = auth.uid();
  
  INSERT INTO gamificacao_eventos (usuario_id, tipo_evento, pontos_ganhos, metadata)
  VALUES (auth.uid(), p_tipo_evento, p_pontos, jsonb_build_object('descricao', p_descricao));
END;
$$;

-- 4. Restrict profiles UPDATE policy - users can only update safe fields
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_update_safe" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  AND familia_id IS NOT DISTINCT FROM (SELECT p.familia_id FROM profiles p WHERE p.id = auth.uid())
  AND pontos_total IS NOT DISTINCT FROM (SELECT p.pontos_total FROM profiles p WHERE p.id = auth.uid())
  AND nivel_gamificacao IS NOT DISTINCT FROM (SELECT p.nivel_gamificacao FROM profiles p WHERE p.id = auth.uid())
);
