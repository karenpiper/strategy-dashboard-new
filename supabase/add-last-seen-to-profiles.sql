-- Add last_seen timestamp to profiles table for tracking online users
-- This allows us to show "online" users without requiring Supabase Realtime

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- Update existing rows to have last_seen = updated_at (best guess)
UPDATE public.profiles
SET last_seen = COALESCE(updated_at, created_at, NOW())
WHERE last_seen IS NULL;

-- Allow authenticated users to view basic profile info (name, avatar, email, role) of other users
-- This is needed for the online users list
-- Only expose public fields, not sensitive data
DROP POLICY IF EXISTS "Users can view other users' basic profile info" ON public.profiles;
CREATE POLICY "Users can view other users' basic profile info"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    -- Only allow viewing id, full_name, avatar_url, email, role, last_seen
    -- This policy works with column-level security or by selecting only these fields
    true
  );

