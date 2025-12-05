-- Add is_guest column to profiles table
-- Guests can see the dashboard but won't appear in dates, anniversaries, curators, etc.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON public.profiles(is_guest);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_guest IS 'If true, user is a guest (not a team member). Guests can see the dashboard but are excluded from birthdays, anniversaries, curator rotation, etc.';

