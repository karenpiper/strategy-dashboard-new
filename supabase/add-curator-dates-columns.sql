-- Add start_date and end_date columns to curator_assignments table
-- These columns were added to track the curation period

-- Add start_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'curator_assignments' 
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.curator_assignments 
    ADD COLUMN start_date DATE;
  END IF;
END $$;

-- Add end_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'curator_assignments' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.curator_assignments 
    ADD COLUMN end_date DATE;
  END IF;
END $$;

-- Update existing rows to have calculated dates based on assignment_date
-- For existing assignments: start_date = assignment_date + 3 days, end_date = start_date + 7 days
UPDATE public.curator_assignments
SET 
  start_date = (assignment_date + INTERVAL '3 days')::DATE,
  end_date = (assignment_date + INTERVAL '10 days')::DATE
WHERE start_date IS NULL OR end_date IS NULL;

-- Make columns NOT NULL after populating existing data
ALTER TABLE public.curator_assignments 
ALTER COLUMN start_date SET NOT NULL;

ALTER TABLE public.curator_assignments 
ALTER COLUMN end_date SET NOT NULL;






