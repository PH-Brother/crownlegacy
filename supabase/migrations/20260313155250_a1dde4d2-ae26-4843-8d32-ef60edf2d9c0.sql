
-- Add missing columns to uploaded_files
ALTER TABLE public.uploaded_files 
  ADD COLUMN IF NOT EXISTS transactions_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

-- Add UPDATE policy for uploaded_files
CREATE POLICY "Users can update own files" ON public.uploaded_files
  FOR UPDATE TO public USING (auth.uid() = user_id);

-- Add DELETE policy for uploaded_files  
CREATE POLICY "Users can delete own files" ON public.uploaded_files
  FOR DELETE TO public USING (auth.uid() = user_id);

-- Add UPDATE policy for transactions
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE TO public USING (auth.uid() = user_id);

-- Add DELETE policy for transactions
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE TO public USING (auth.uid() = user_id);

-- Create financial-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-documents', 'financial-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for financial-documents bucket
CREATE POLICY "Users can upload own financial docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financial-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own financial docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financial-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own financial docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'financial-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
