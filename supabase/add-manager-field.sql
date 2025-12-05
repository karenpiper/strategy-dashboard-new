-- Add manager_id field to profiles table for org chart hierarchy
-- This creates a self-referential relationship where each profile can have a manager

DO $$ 
BEGIN
  -- Add manager_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.profiles.manager_id IS 'References another profile (manager). NULL means top-level (no manager).';
  END IF;

  -- Add index for faster lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND indexname = 'profiles_manager_id_idx'
  ) THEN
    CREATE INDEX profiles_manager_id_idx ON public.profiles(manager_id);
  END IF;
END $$;

-- Optional: Add hierarchy_level for easier querying (can be calculated, but useful for performance)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'hierarchy_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN hierarchy_level INTEGER DEFAULT 0;
    COMMENT ON COLUMN public.profiles.hierarchy_level IS 'Depth in org chart (0 = top level, 1 = reports to top level, etc.). Can be calculated from manager_id but useful for performance.';
  END IF;
END $$;

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('manager_id', 'hierarchy_level')
ORDER BY column_name;



