
-- Table: financial_insights
CREATE TABLE public.financial_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patterns JSONB DEFAULT '[]'::jsonb,
  alerts JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  health_score INTEGER DEFAULT 0,
  health_message TEXT DEFAULT '',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON public.financial_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON public.financial_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.financial_insights FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_financial_insights_user_expires ON public.financial_insights(user_id, expires_at);

-- Table: chat_messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at DESC);

-- Table: wealth_projections
CREATE TABLE public.wealth_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  net_worth_initial NUMERIC(12,2) NOT NULL,
  monthly_savings NUMERIC(12,2) NOT NULL,
  annual_return NUMERIC(5,2) NOT NULL,
  projection_years INTEGER NOT NULL,
  scenarios JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.wealth_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projections" ON public.wealth_projections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projections" ON public.wealth_projections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_wealth_projections_user_created ON public.wealth_projections(user_id, created_at DESC);
