
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  familia_id UUID REFERENCES public.familias(id),
  nome_original TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  analise_resultado TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_select_own" ON public.documentos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "documentos_insert_own" ON public.documentos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "documentos_update_own" ON public.documentos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "documentos_delete_own" ON public.documentos FOR DELETE TO authenticated USING (user_id = auth.uid());
