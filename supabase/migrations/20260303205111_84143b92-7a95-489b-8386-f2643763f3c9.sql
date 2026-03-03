-- Revalidação de assinatura + hardening de search_path sem alterar lógica
ALTER FUNCTION public.add_gamification_points(integer, text, text)
  SECURITY DEFINER
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_family_with_admin(text, text)
  SECURITY DEFINER
  SET search_path = public, pg_temp;

ALTER FUNCTION public.join_family_with_code(text)
  SECURITY DEFINER
  SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.add_gamification_points(integer, text, text)
IS 'Reviewed 2026-03-03: frontend RPC signature validated against TypeScript calls (p_pontos int, p_tipo_evento text, p_descricao text); SECURITY DEFINER with fixed search_path public, pg_temp.';

COMMENT ON FUNCTION public.create_family_with_admin(text, text)
IS 'Reviewed 2026-03-03: frontend RPC signature validated against TypeScript calls (p_nome text, p_codigo_convite text); SECURITY DEFINER with fixed search_path public, pg_temp.';

COMMENT ON FUNCTION public.join_family_with_code(text)
IS 'Reviewed 2026-03-03: frontend RPC signature validated against TypeScript calls (p_codigo_convite text); SECURITY DEFINER with fixed search_path public, pg_temp.';