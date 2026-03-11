
-- family_invites table
CREATE TABLE IF NOT EXISTS public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id uuid REFERENCES public.familias(id) NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  UNIQUE(familia_id, email)
);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_can_see_own_invites" ON public.family_invites
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "family_admin_manage_invites" ON public.family_invites
  FOR ALL USING (
    familia_id = public.get_user_familia_id(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_family_invites_email ON public.family_invites(email);
CREATE INDEX IF NOT EXISTS idx_family_invites_familia ON public.family_invites(familia_id);
