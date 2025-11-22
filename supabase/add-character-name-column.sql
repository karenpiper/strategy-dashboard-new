-- Add character_name column to horoscopes table
-- This stores the silly character name generated once per day with the horoscope

DO $$ 
BEGIN
  -- Add character_name column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'horoscopes' 
    AND column_name = 'character_name'
  ) THEN
    ALTER TABLE public.horoscopes 
    ADD COLUMN character_name TEXT;
    
    COMMENT ON COLUMN public.horoscopes.character_name IS 'Silly character name generated once per day (e.g., "Stellar Silliness", "Bubbles McWobble")';
  END IF;
END $$;

