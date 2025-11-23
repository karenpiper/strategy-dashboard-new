-- Team Pulse Responses Table
CREATE TABLE IF NOT EXISTS public.team_pulse_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL, -- ISO date string for Monday of the week (YYYY-MM-DD)
  question_key TEXT NOT NULL, -- e.g., 'week', 'priorities', 'workload'
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
  -- Note: Multiple submissions per user per week per question are allowed
);

-- Enable Row Level Security
ALTER TABLE public.team_pulse_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own responses
CREATE POLICY "Users can view own responses"
  ON public.team_pulse_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can insert own responses"
  ON public.team_pulse_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses (within the same week)
CREATE POLICY "Users can update own responses"
  ON public.team_pulse_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage all responses"
  ON public.team_pulse_responses
  USING (auth.role() = 'service_role');

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_team_pulse_week_key ON public.team_pulse_responses(week_key);
CREATE INDEX IF NOT EXISTS idx_team_pulse_user_week ON public.team_pulse_responses(user_id, week_key);
CREATE INDEX IF NOT EXISTS idx_team_pulse_question_week ON public.team_pulse_responses(question_key, week_key);

