CREATE OR REPLACE FUNCTION public.increment_referral_clicks(p_referral_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_links SET clicks = clicks + 1 WHERE referral_code = p_referral_code;
END;
$$;