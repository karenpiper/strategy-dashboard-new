-- Horoscopes table for caching daily horoscopes
CREATE TABLE IF NOT EXISTS public.horoscopes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  star_sign TEXT NOT NULL,
  horoscope_text TEXT NOT NULL,
  horoscope_dos JSONB NOT NULL DEFAULT '[]'::jsonb,
  horoscope_donts JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT NOT NULL,
  style_family TEXT,
  style_key TEXT,
  style_label TEXT,
  character_type TEXT, -- 'human', 'animal', 'object', 'hybrid'
  setting_hint TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_horoscopes_user_id ON public.horoscopes(user_id);
CREATE INDEX IF NOT EXISTS idx_horoscopes_date ON public.horoscopes(date);
CREATE INDEX IF NOT EXISTS idx_horoscopes_user_date ON public.horoscopes(user_id, date);

-- Enable Row Level Security
ALTER TABLE public.horoscopes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view their own horoscopes" ON public.horoscopes;
DROP POLICY IF EXISTS "Users can insert their own horoscopes" ON public.horoscopes;
DROP POLICY IF EXISTS "Users can update their own horoscopes" ON public.horoscopes;

-- Users can only view their own horoscopes (read-only)
-- Insert/Update operations are handled server-side by the API route using service role
CREATE POLICY "Users can view their own horoscopes"
  ON public.horoscopes FOR SELECT
  USING (auth.uid() = user_id);

-- Note: The profiles/users table should have these fields:
-- - birthday (stored as "MM/DD" string or separate month/day fields)
-- - discipline (used as department for horoscope personalization)
-- - role (used as title for horoscope personalization)
-- The API route will try both 'profiles' and 'users' table names

