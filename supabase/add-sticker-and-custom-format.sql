-- Add sticker_url and custom_format columns to announcements table
-- This migration safely adds both columns if they don't exist

DO $$ 
BEGIN
  -- Add sticker_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'announcements' 
    AND column_name = 'sticker_url'
  ) THEN
    ALTER TABLE public.announcements 
    ADD COLUMN sticker_url TEXT;
  END IF;

  -- Add custom_format column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'announcements' 
    AND column_name = 'custom_format'
  ) THEN
    ALTER TABLE public.announcements 
    ADD COLUMN custom_format TEXT;
  END IF;

  -- Also ensure text_format column exists (in case it was added separately)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'announcements' 
    AND column_name = 'text_format'
  ) THEN
    ALTER TABLE public.announcements 
    ADD COLUMN text_format TEXT DEFAULT 'days_until';
  END IF;
END $$;



