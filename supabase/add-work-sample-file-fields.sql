-- Add file and thumbnail fields to work_samples table
-- Run this in your Supabase SQL Editor
-- NOTE: Make sure to run create-work-samples-table.sql first if the table doesn't exist

DO $$
BEGIN
  -- Check if table exists before altering
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_samples') THEN
    ALTER TABLE public.work_samples
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS file_link TEXT,
    ADD COLUMN IF NOT EXISTS file_name TEXT;

    -- Add comments for documentation
    COMMENT ON COLUMN public.work_samples.thumbnail_url IS 'URL for thumbnail image stored in Supabase storage';
    COMMENT ON COLUMN public.work_samples.file_url IS 'Google Drive file URL after upload';
    COMMENT ON COLUMN public.work_samples.file_link IS 'Optional external link to file';
    COMMENT ON COLUMN public.work_samples.file_name IS 'Original filename for display';
  ELSE
    RAISE NOTICE 'Table work_samples does not exist. Please run create-work-samples-table.sql first.';
  END IF;
END $$;

