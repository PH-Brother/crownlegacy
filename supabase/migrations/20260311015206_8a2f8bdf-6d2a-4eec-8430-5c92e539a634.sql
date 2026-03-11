
-- Add unique constraint on financial_scores for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_scores_user_id_unique'
  ) THEN
    ALTER TABLE public.financial_scores ADD CONSTRAINT financial_scores_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
