-- Weekly Questions Table
-- Stores the question of the week and text-based answers (different from team pulse)
CREATE TABLE IF NOT EXISTS public.weekly_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  week_start_date DATE NOT NULL, -- Monday of the week (YYYY-MM-DD)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(week_start_date) -- One question per week
);

-- Weekly Question Answers Table
-- Stores text answers to weekly questions
CREATE TABLE IF NOT EXISTS public.weekly_question_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.weekly_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(question_id, user_id) -- One answer per user per question
);

-- Enable Row Level Security
ALTER TABLE public.weekly_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_question_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_questions
-- Everyone can view questions
CREATE POLICY "Anyone can view weekly questions"
  ON public.weekly_questions FOR SELECT
  USING (true);

-- Only authenticated users can insert questions (or service role)
CREATE POLICY "Authenticated users can insert weekly questions"
  ON public.weekly_questions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role can do everything
CREATE POLICY "Service role can manage weekly questions"
  ON public.weekly_questions
  USING (auth.role() = 'service_role');

-- RLS Policies for weekly_question_answers
-- Everyone can view answers
CREATE POLICY "Anyone can view weekly question answers"
  ON public.weekly_question_answers FOR SELECT
  USING (true);

-- Users can insert their own answers
CREATE POLICY "Users can insert own answers"
  ON public.weekly_question_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own answers
CREATE POLICY "Users can update own answers"
  ON public.weekly_question_answers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage weekly question answers"
  ON public.weekly_question_answers
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_questions_week_start ON public.weekly_questions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_question_answers_question_id ON public.weekly_question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_weekly_question_answers_user_id ON public.weekly_question_answers(user_id);

