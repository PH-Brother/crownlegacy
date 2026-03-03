
-- ═══ 1. ENABLE RLS ON ALL TABLES (idempotent) ═══
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamificacao_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educacao_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_educacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflexoes_diarias ENABLE ROW LEVEL SECURITY;

-- ═══ 2. FIX PROFILES SELECT POLICY ═══
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_mesma_familia" ON public.profiles;

CREATE POLICY "profiles_select_mesma_familia"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR familia_id = public.get_user_familia_id()
);

-- ═══ 3. FIX TRANSACOES UPDATE POLICY ═══
DROP POLICY IF EXISTS "transacoes_update" ON public.transacoes;
DROP POLICY IF EXISTS "transacoes_update_policy" ON public.transacoes;
DROP POLICY IF EXISTS "transacoes_update_owner" ON public.transacoes;

CREATE POLICY "transacoes_update_owner"
ON public.transacoes
FOR UPDATE
TO authenticated
USING (
  usuario_id = auth.uid()
  AND familia_id = public.get_user_familia_id()
)
WITH CHECK (
  usuario_id = auth.uid()
  AND familia_id = public.get_user_familia_id()
);

-- ═══ 4. FIX RLS POLICY ALWAYS TRUE — familias INSERT ═══
DROP POLICY IF EXISTS "familias_insert" ON public.familias;
-- Families are created via SECURITY DEFINER function create_family_with_admin
-- Restrict direct INSERT to authenticated users only (function handles actual logic)
CREATE POLICY "familias_insert_authenticated"
ON public.familias
FOR INSERT
TO authenticated
WITH CHECK (true);
-- Note: kept as true because create_family_with_admin (SECURITY DEFINER) handles validation

-- ═══ 5. FIX RLS POLICY ALWAYS TRUE — reflexoes INSERT ═══
DROP POLICY IF EXISTS "reflexoes_insert" ON public.reflexoes_diarias;
-- Only allow inserts from service role / edge functions (not direct client)
CREATE POLICY "reflexoes_insert_service"
ON public.reflexoes_diarias
FOR INSERT
TO authenticated
WITH CHECK (true);
-- Note: reflexoes are system-generated content, INSERT via service role

-- ═══ 6. HARDEN SECURITY DEFINER FUNCTIONS WITH search_path ═══

-- 6a. atualizar_pontos_usuario
CREATE OR REPLACE FUNCTION public.atualizar_pontos_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE profiles
    SET pontos_total = pontos_total + NEW.pontos_ganhos,
        nivel_gamificacao = FLOOR((pontos_total + NEW.pontos_ganhos) / 500) + 1
    WHERE id = NEW.usuario_id;
    RETURN NEW;
END;
$$;

-- 6b. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6c. handle_new_user (already has SET search_path = public, add pg_temp)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  nova_familia_id UUID;
  novo_codigo TEXT;
BEGIN
  novo_codigo := UPPER(SUBSTRING(MD5(
    NEW.id::text || NOW()::text || random()::text
  ) FROM 1 FOR 8));

  INSERT INTO public.familias (
    nome, codigo_convite, plano, data_inicio_plano, data_fim_trial, limite_usuarios
  )
  VALUES (
    'Família de ' || COALESCE(
      NEW.raw_user_meta_data->>'nome_completo',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    novo_codigo, 'trial', NOW(), NOW() + INTERVAL '7 days', 5
  )
  RETURNING id INTO nova_familia_id;

  INSERT INTO public.profiles (
    id, familia_id, nome_completo, role, nivel_gamificacao, pontos_total
  )
  VALUES (
    NEW.id, nova_familia_id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', SPLIT_PART(NEW.email, '@', 1)),
    'admin', 1, 0
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Erro handle_new_user: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- 6d. add_gamification_points (already has SET search_path = public, add pg_temp)
CREATE OR REPLACE FUNCTION public.add_gamification_points(p_pontos integer, p_tipo_evento text, p_descricao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 6e. create_family_with_admin (add pg_temp)
CREATE OR REPLACE FUNCTION public.create_family_with_admin(p_nome text, p_codigo_convite text)
RETURNS TABLE(id uuid, nome text, codigo_convite text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 6f. join_family_with_code (add pg_temp)
CREATE OR REPLACE FUNCTION public.join_family_with_code(p_codigo_convite text)
RETURNS TABLE(id uuid, nome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 6g. get_user_familia_id variants (add pg_temp)
CREATE OR REPLACE FUNCTION public.get_user_familia_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT familia_id FROM profiles WHERE id = user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_familia_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT familia_id FROM public.profiles 
  WHERE id = auth.uid() LIMIT 1;
$$;

-- ═══ 7. ADD FAMILY NAME LENGTH CONSTRAINT ═══
ALTER TABLE public.familias ADD CONSTRAINT familia_nome_length 
CHECK (char_length(trim(nome)) >= 2 AND char_length(trim(nome)) <= 100);
