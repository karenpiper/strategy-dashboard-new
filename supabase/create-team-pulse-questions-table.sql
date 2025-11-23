-- Team Pulse Questions Table
CREATE TABLE IF NOT EXISTS public.team_pulse_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_key TEXT UNIQUE NOT NULL,
  question_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.team_pulse_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.team_pulse_questions;
DROP POLICY IF EXISTS "Service role can manage all questions" ON public.team_pulse_questions;

-- RLS Policies - Everyone can read active questions
CREATE POLICY "Anyone can view active questions"
  ON public.team_pulse_questions FOR SELECT
  USING (is_active = true);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage all questions"
  ON public.team_pulse_questions
  USING (auth.role() = 'service_role');

-- Insert default questions
INSERT INTO public.team_pulse_questions (question_key, question_text, is_active) VALUES
  ('week', 'How is your week?', true),
  ('priorities', 'How clear are priorities?', true),
  ('workload', 'How heavy is your workload?', true),
  ('support', 'How supported do you feel?', true),
  ('energy', 'How is your energy level?', true),
  ('collaboration', 'How is team collaboration?', true),
  ('feedback', 'How useful is the feedback you receive?', true),
  ('balance', 'How is your work-life balance?', true),
  ('growth', 'How are you growing?', true),
  ('satisfaction', 'How satisfied are you with your work?', true)
ON CONFLICT (question_key) DO UPDATE SET 
  question_text = EXCLUDED.question_text,
  updated_at = TIMEZONE('utc', NOW());

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_team_pulse_questions_active ON public.team_pulse_questions(is_active);

