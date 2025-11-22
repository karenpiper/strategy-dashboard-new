-- Comprehensive migration to ensure horoscopes table has all required columns
-- This migration adds any missing columns to match the expected schema
-- Safe to run multiple times - uses IF NOT EXISTS checks

DO $$ 
BEGIN
  -- Add horoscope_dos column (JSONB array)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'horoscope_dos'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN horoscope_dos JSONB NOT NULL DEFAULT '[]'::jsonb;
    
    COMMENT ON COLUMN public.horoscopes.horoscope_dos IS 'Array of "do" suggestions for the horoscope';
  END IF;

  -- Add horoscope_donts column (JSONB array)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'horoscope_donts'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN horoscope_donts JSONB NOT NULL DEFAULT '[]'::jsonb;
    
    COMMENT ON COLUMN public.horoscopes.horoscope_donts IS 'Array of "don''t" suggestions for the horoscope';
  END IF;

  -- Add character_type column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'character_type'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN character_type TEXT;
    
    COMMENT ON COLUMN public.horoscopes.character_type IS 'Character type: human, animal, object, or hybrid';
  END IF;

  -- Add setting_hint column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'setting_hint'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN setting_hint TEXT;
    
    COMMENT ON COLUMN public.horoscopes.setting_hint IS 'Setting hint for image generation';
  END IF;

  -- Add style_key column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'style_key'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN style_key TEXT;
    
    COMMENT ON COLUMN public.horoscopes.style_key IS 'Style key identifier (e.g., oil_painting, pixel_art)';
  END IF;

  -- Add style_label column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'style_label'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN style_label TEXT;
    
    COMMENT ON COLUMN public.horoscopes.style_label IS 'Human-readable style label (e.g., Oil painting, Pixel art)';
  END IF;

  -- Add style_family column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'style_family'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN style_family TEXT;
    
    COMMENT ON COLUMN public.horoscopes.style_family IS 'Style family (e.g., AnalogColor, CharacterCartoon)';
  END IF;

  -- Add image_prompt column (if missing)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'image_prompt'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN image_prompt TEXT;
    
    COMMENT ON COLUMN public.horoscopes.image_prompt IS 'The full prompt used to generate the image';
  END IF;

  -- Add date column (if missing - should exist but checking anyway)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'date'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    
    COMMENT ON COLUMN public.horoscopes.date IS 'Date for this horoscope (YYYY-MM-DD)';
  END IF;

  -- Add generated_at column (if missing)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'generated_at'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL;
    
    COMMENT ON COLUMN public.horoscopes.generated_at IS 'Timestamp when the horoscope was generated';
  END IF;

  -- Ensure unique constraint exists on (user_id, date)
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'horoscopes_user_id_date_key'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD CONSTRAINT horoscopes_user_id_date_key UNIQUE (user_id, date);
  END IF;

END $$;

