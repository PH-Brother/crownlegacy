DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'behavior_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.behavior_profiles ADD CONSTRAINT behavior_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;