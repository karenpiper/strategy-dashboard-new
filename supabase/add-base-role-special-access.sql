-- Add base_role and special_access columns to profiles table if they don't exist
-- These columns are used for role-based access control

DO $$ 
BEGIN
  -- Add base_role column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'base_role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN base_role TEXT NOT NULL DEFAULT 'user';
    
    -- Add check constraint
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_base_role_check 
    CHECK (base_role IN ('user', 'contributor', 'leader', 'admin'));
    
    COMMENT ON COLUMN public.profiles.base_role IS 'Base role: user, contributor, leader, or admin';
  END IF;

  -- Add special_access column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'special_access'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN special_access TEXT[] DEFAULT '{}';
    
    COMMENT ON COLUMN public.profiles.special_access IS 'Array of special access permissions (e.g., curator, beast_babe)';
  END IF;

  -- Create index on base_role for faster queries
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND indexname = 'idx_profiles_base_role'
  ) THEN
    CREATE INDEX idx_profiles_base_role ON public.profiles(base_role);
  END IF;
END $$;

