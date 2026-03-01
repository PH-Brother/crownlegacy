
-- Add missing columns
ALTER TABLE familias ADD COLUMN IF NOT EXISTS codigo_convite text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefone text;

-- Unique index on codigo_convite
CREATE UNIQUE INDEX IF NOT EXISTS idx_familias_codigo_convite ON familias(codigo_convite) WHERE codigo_convite IS NOT NULL;

-- INSERT policy for profiles
CREATE POLICY "auth_users_insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- INSERT policy for familias
CREATE POLICY "auth_users_create_family" ON familias FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE policy for familias
CREATE POLICY "family_members_update_family" ON familias FOR UPDATE TO authenticated USING (id IN (SELECT p.familia_id FROM profiles p WHERE p.id = auth.uid()));

-- INSERT policy for ia_analises
CREATE POLICY "family_members_insert_analysis" ON ia_analises FOR INSERT TO authenticated WITH CHECK (familia_id IN (SELECT p.familia_id FROM profiles p WHERE p.id = auth.uid()));

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatar_view" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
