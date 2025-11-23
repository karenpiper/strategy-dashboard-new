-- Add timezone field to profiles table
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN
  -- Add timezone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN timezone TEXT;
    COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London)';
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
  AND column_name = 'timezone';

