
-- ═══ 1. FIX CONFLICTING PROFILES UPDATE POLICIES ═══
-- Drop the permissive profiles_update that conflicts with profiles_update_safe
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Ensure profiles_update_safe exists with proper restrictions
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

-- ═══ 2. FIX PROFILES SELECT — deduplicate ═══
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_mesma_familia" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR familia_id = public.get_user_familia_id()
);

-- ═══ 3. FIX ALWAYS-TRUE INSERT POLICIES ═══
-- familias: only allow insert via authenticated (SECURITY DEFINER handles real logic)
DROP POLICY IF EXISTS "familias_insert" ON public.familias;
DROP POLICY IF EXISTS "familias_insert_authenticated" ON public.familias;
CREATE POLICY "familias_insert_via_rpc" ON public.familias
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- reflexoes_diarias: restrict insert to service role only by removing anon/authenticated
DROP POLICY IF EXISTS "reflexoes_insert_service" ON public.reflexoes_diarias;
DROP POLICY IF EXISTS "reflexoes_insert" ON public.reflexoes_diarias;
-- Recreate: only service_role can insert (no policy for authenticated = blocked)

-- reflexoes SELECT: deduplicate
DROP POLICY IF EXISTS "reflexoes_select" ON public.reflexoes_diarias;
DROP POLICY IF EXISTS "reflexoes_select_logado" ON public.reflexoes_diarias;
CREATE POLICY "reflexoes_select_authenticated" ON public.reflexoes_diarias
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- ═══ 4. DEDUPLICATE OTHER POLICIES ═══
-- gamificacao_eventos: remove duplicates
DROP POLICY IF EXISTS "gamificacao_insert" ON public.gamificacao_eventos;
DROP POLICY IF EXISTS "gamificacao_insert_proprio" ON public.gamificacao_eventos;
CREATE POLICY "gamificacao_insert_own" ON public.gamificacao_eventos
FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "gamificacao_select" ON public.gamificacao_eventos;
DROP POLICY IF EXISTS "gamificacao_select_proprio" ON public.gamificacao_eventos;
CREATE POLICY "gamificacao_select_own" ON public.gamificacao_eventos
FOR SELECT TO authenticated
USING (usuario_id = auth.uid());

-- progresso_educacao: remove duplicates
DROP POLICY IF EXISTS "progresso_insert" ON public.progresso_educacao;
DROP POLICY IF EXISTS "progresso_insert_proprio" ON public.progresso_educacao;
CREATE POLICY "progresso_insert_own" ON public.progresso_educacao
FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "progresso_select" ON public.progresso_educacao;
DROP POLICY IF EXISTS "progresso_select_proprio" ON public.progresso_educacao;
CREATE POLICY "progresso_select_own" ON public.progresso_educacao
FOR SELECT TO authenticated
USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "progresso_update" ON public.progresso_educacao;
DROP POLICY IF EXISTS "progresso_update_proprio" ON public.progresso_educacao;
CREATE POLICY "progresso_update_own" ON public.progresso_educacao
FOR UPDATE TO authenticated
USING (usuario_id = auth.uid());

-- ia_analises: remove duplicates
DROP POLICY IF EXISTS "ia_analises_insert" ON public.ia_analises;
DROP POLICY IF EXISTS "ia_analises_insert_familia" ON public.ia_analises;
CREATE POLICY "ia_analises_insert_own" ON public.ia_analises
FOR INSERT TO authenticated
WITH CHECK (familia_id = public.get_user_familia_id());

DROP POLICY IF EXISTS "ia_analises_select" ON public.ia_analises;
DROP POLICY IF EXISTS "ia_analises_select_familia" ON public.ia_analises;
CREATE POLICY "ia_analises_select_own" ON public.ia_analises
FOR SELECT TO authenticated
USING (familia_id = public.get_user_familia_id());

-- metas_financeiras: remove duplicates
DROP POLICY IF EXISTS "metas_insert" ON public.metas_financeiras;
DROP POLICY IF EXISTS "metas_insert_familia" ON public.metas_financeiras;
CREATE POLICY "metas_insert_own" ON public.metas_financeiras
FOR INSERT TO authenticated
WITH CHECK (familia_id = public.get_user_familia_id());

DROP POLICY IF EXISTS "metas_select" ON public.metas_financeiras;
DROP POLICY IF EXISTS "metas_select_familia" ON public.metas_financeiras;
CREATE POLICY "metas_select_own" ON public.metas_financeiras
FOR SELECT TO authenticated
USING (familia_id = public.get_user_familia_id());

DROP POLICY IF EXISTS "metas_update" ON public.metas_financeiras;
DROP POLICY IF EXISTS "metas_update_familia" ON public.metas_financeiras;
CREATE POLICY "metas_update_own" ON public.metas_financeiras
FOR UPDATE TO authenticated
USING (familia_id = public.get_user_familia_id());

-- educacao_modulos: remove duplicates
DROP POLICY IF EXISTS "educacao_modulos_select" ON public.educacao_modulos;
DROP POLICY IF EXISTS "educacao_select_logado" ON public.educacao_modulos;
CREATE POLICY "educacao_select_active" ON public.educacao_modulos
FOR SELECT TO authenticated
USING (ativo = true);

-- transacoes: deduplicate update
DROP POLICY IF EXISTS "transacoes_update" ON public.transacoes;
DROP POLICY IF EXISTS "transacoes_update_owner" ON public.transacoes;
CREATE POLICY "transacoes_update_own" ON public.transacoes
FOR UPDATE TO authenticated
USING (
  usuario_id = auth.uid()
  AND familia_id = public.get_user_familia_id()
)
WITH CHECK (
  usuario_id = auth.uid()
  AND familia_id = public.get_user_familia_id()
);
