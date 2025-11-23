-- Add slack_id field to profiles table
-- Run this in your Supabase SQL Editor

-- Add slack_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'slack_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN slack_id TEXT;
    COMMENT ON COLUMN public.profiles.slack_id IS 'Slack user ID for integration purposes (admin only)';
  END IF;
END $$;

-- Verify column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'slack_id';

