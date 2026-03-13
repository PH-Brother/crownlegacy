
-- Phase 3: Wisdom Challenges
CREATE TABLE public.wisdom_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'save_category',
  category TEXT,
  target_amount NUMERIC(12,2) DEFAULT 0,
  actual_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  streak_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.wisdom_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own challenges" ON public.wisdom_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_challenges_user_status ON public.wisdom_challenges(user_id, status, created_at DESC);

-- Phase 3: Challenge Rewards
CREATE TABLE public.challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.wisdom_challenges(id) ON DELETE CASCADE NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'points',
  points INTEGER DEFAULT 0,
  badge_name TEXT,
  earned_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.challenge_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rewards" ON public.challenge_rewards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_rewards_user_earned ON public.challenge_rewards(user_id, earned_at DESC);

-- Phase 5: Share Events
CREATE TABLE public.share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  shared_at TIMESTAMPTZ DEFAULT now(),
  click_count INTEGER DEFAULT 0
);
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shares" ON public.share_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_share_events_user ON public.share_events(user_id, shared_at DESC);

-- Phase 5: Referral Links
CREATE TABLE public.referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own referrals" ON public.referral_links FOR ALL USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);
CREATE INDEX idx_referral_links_code ON public.referral_links(referral_code);

-- Phase 4: Shared Goals (leveraging existing familia system)
CREATE TABLE public.shared_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id UUID REFERENCES public.familias(id) ON DELETE CASCADE NOT NULL,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.shared_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family members view shared goals" ON public.shared_goals FOR SELECT USING (familia_id = public.get_user_familia_id(auth.uid()));
CREATE POLICY "Family members insert shared goals" ON public.shared_goals FOR INSERT WITH CHECK (familia_id = public.get_user_familia_id(auth.uid()));
CREATE POLICY "Family members update shared goals" ON public.shared_goals FOR UPDATE USING (familia_id = public.get_user_familia_id(auth.uid()));
CREATE POLICY "Creator deletes shared goals" ON public.shared_goals FOR DELETE USING (created_by = auth.uid());
CREATE INDEX idx_shared_goals_familia ON public.shared_goals(familia_id);
