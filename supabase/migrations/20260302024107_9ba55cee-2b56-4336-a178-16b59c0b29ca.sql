
-- 1. Create security definer function to get user's familia_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_familia_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT familia_id FROM profiles WHERE id = user_id LIMIT 1;
$$;

-- 2. Drop old recursive SELECT policy on profiles
DROP POLICY IF EXISTS "Usuários veem perfis da própria família" ON profiles;

-- 3. Create new non-recursive SELECT policy: user sees own profile + family members
CREATE POLICY "users_see_own_and_family_profiles" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR familia_id = public.get_user_familia_id(auth.uid())
);

-- 4. Fix familias SELECT policy (also references profiles recursively)
DROP POLICY IF EXISTS "Membros veem dados da própria família" ON familias;
CREATE POLICY "members_see_own_family" ON familias
FOR SELECT TO authenticated
USING (id = public.get_user_familia_id(auth.uid()));

-- 5. Fix familias UPDATE policy
DROP POLICY IF EXISTS "family_members_update_family" ON familias;
CREATE POLICY "family_members_update_family" ON familias
FOR UPDATE TO authenticated
USING (id = public.get_user_familia_id(auth.uid()));

-- 6. Fix transacoes policies
DROP POLICY IF EXISTS "Usuários veem transações da própria família" ON transacoes;
CREATE POLICY "users_see_family_transactions" ON transacoes
FOR SELECT TO authenticated
USING (familia_id = public.get_user_familia_id(auth.uid()));

DROP POLICY IF EXISTS "Usuários inserem transações em sua família" ON transacoes;
CREATE POLICY "users_insert_family_transactions" ON transacoes
FOR INSERT TO authenticated
WITH CHECK (familia_id = public.get_user_familia_id(auth.uid()));

DROP POLICY IF EXISTS "Usuários editam transações da própria família" ON transacoes;
CREATE POLICY "users_update_family_transactions" ON transacoes
FOR UPDATE TO authenticated
USING (familia_id = public.get_user_familia_id(auth.uid()));

DROP POLICY IF EXISTS "Usuários deletam transações da própria família" ON transacoes;
CREATE POLICY "users_delete_family_transactions" ON transacoes
FOR DELETE TO authenticated
USING (familia_id = public.get_user_familia_id(auth.uid()));

-- 7. Fix metas_financeiras policy
DROP POLICY IF EXISTS "Famílias veem apenas suas metas" ON metas_financeiras;
CREATE POLICY "family_members_manage_goals" ON metas_financeiras
FOR ALL TO authenticated
USING (familia_id = public.get_user_familia_id(auth.uid()));

-- 8. Fix ia_analises policies
DROP POLICY IF EXISTS "Família vê apenas suas análises" ON ia_analises;
CREATE POLICY "family_see_analyses" ON ia_analises
FOR SELECT TO authenticated
USING (familia_id = public.get_user_familia_id(auth.uid()));

DROP POLICY IF EXISTS "family_members_insert_analysis" ON ia_analises;
CREATE POLICY "family_insert_analyses" ON ia_analises
FOR INSERT TO authenticated
WITH CHECK (familia_id = public.get_user_familia_id(auth.uid()));
