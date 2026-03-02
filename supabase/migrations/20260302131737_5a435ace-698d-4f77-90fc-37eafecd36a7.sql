
-- =============================================
-- FIX: Change ALL RESTRICTIVE policies to PERMISSIVE
-- and use get_user_familia_id() to avoid recursion
-- =============================================

-- 1. PROFILES - Drop restrictive, create permissive
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- 2. FAMILIAS - Drop restrictive, create permissive
DROP POLICY IF EXISTS familias_select ON familias;
DROP POLICY IF EXISTS familias_insert ON familias;
DROP POLICY IF EXISTS familias_update ON familias;

CREATE POLICY "familias_select" ON familias FOR SELECT USING (true);
CREATE POLICY "familias_insert" ON familias FOR INSERT WITH CHECK (true);
CREATE POLICY "familias_update" ON familias FOR UPDATE USING (
  id = public.get_user_familia_id()
);

-- 3. TRANSACOES - Use get_user_familia_id() to avoid querying profiles
DROP POLICY IF EXISTS transacoes_select ON transacoes;
DROP POLICY IF EXISTS transacoes_insert ON transacoes;
DROP POLICY IF EXISTS transacoes_update ON transacoes;
DROP POLICY IF EXISTS transacoes_delete ON transacoes;

CREATE POLICY "transacoes_select" ON transacoes FOR SELECT USING (
  familia_id = public.get_user_familia_id()
);
CREATE POLICY "transacoes_insert" ON transacoes FOR INSERT WITH CHECK (
  familia_id = public.get_user_familia_id()
);
CREATE POLICY "transacoes_update" ON transacoes FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY "transacoes_delete" ON transacoes FOR DELETE USING (usuario_id = auth.uid());

-- 4. GAMIFICACAO_EVENTOS - Drop restrictive, create permissive
DROP POLICY IF EXISTS gamificacao_select ON gamificacao_eventos;
DROP POLICY IF EXISTS gamificacao_insert ON gamificacao_eventos;

CREATE POLICY "gamificacao_select" ON gamificacao_eventos FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "gamificacao_insert" ON gamificacao_eventos FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- 5. IA_ANALISES - Use get_user_familia_id()
DROP POLICY IF EXISTS ia_analises_select ON ia_analises;
DROP POLICY IF EXISTS ia_analises_insert ON ia_analises;

CREATE POLICY "ia_analises_select" ON ia_analises FOR SELECT USING (
  familia_id = public.get_user_familia_id()
);
CREATE POLICY "ia_analises_insert" ON ia_analises FOR INSERT WITH CHECK (
  familia_id = public.get_user_familia_id()
);

-- 6. METAS_FINANCEIRAS - Use get_user_familia_id()
DROP POLICY IF EXISTS metas_select ON metas_financeiras;
DROP POLICY IF EXISTS metas_insert ON metas_financeiras;
DROP POLICY IF EXISTS metas_update ON metas_financeiras;
DROP POLICY IF EXISTS metas_delete ON metas_financeiras;

CREATE POLICY "metas_select" ON metas_financeiras FOR SELECT USING (
  familia_id = public.get_user_familia_id()
);
CREATE POLICY "metas_insert" ON metas_financeiras FOR INSERT WITH CHECK (
  familia_id = public.get_user_familia_id()
);
CREATE POLICY "metas_update" ON metas_financeiras FOR UPDATE USING (
  familia_id = public.get_user_familia_id()
);
CREATE POLICY "metas_delete" ON metas_financeiras FOR DELETE USING (criador_id = auth.uid());

-- 7. REFLEXOES_DIARIAS - Drop restrictive, create permissive
DROP POLICY IF EXISTS reflexoes_select ON reflexoes_diarias;
DROP POLICY IF EXISTS reflexoes_insert ON reflexoes_diarias;

CREATE POLICY "reflexoes_select" ON reflexoes_diarias FOR SELECT USING (true);
CREATE POLICY "reflexoes_insert" ON reflexoes_diarias FOR INSERT WITH CHECK (true);

-- 8. EDUCACAO_MODULOS
DROP POLICY IF EXISTS educacao_read ON educacao_modulos;
CREATE POLICY "educacao_read" ON educacao_modulos FOR SELECT USING (ativo = true);

-- 9. PROGRESSO_EDUCACAO
DROP POLICY IF EXISTS progresso_select ON progresso_educacao;
DROP POLICY IF EXISTS progresso_insert ON progresso_educacao;
DROP POLICY IF EXISTS progresso_update ON progresso_educacao;

CREATE POLICY "progresso_select" ON progresso_educacao FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "progresso_insert" ON progresso_educacao FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "progresso_update" ON progresso_educacao FOR UPDATE USING (usuario_id = auth.uid());
