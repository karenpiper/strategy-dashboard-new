-- Add submitted_by column to work_samples table
-- This allows tracking who submitted the work sample, separate from who created the record
DO $$ 
BEGIN
  -- Add submitted_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'work_samples' 
    AND column_name = 'submitted_by'
  ) THEN
    ALTER TABLE public.work_samples 
      ADD COLUMN submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    
    -- Add index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_work_samples_submitted_by ON public.work_samples(submitted_by);
    
    COMMENT ON COLUMN public.work_samples.submitted_by IS 'User who submitted this work sample (can be different from created_by or author_id)';
  END IF;
END $$;

