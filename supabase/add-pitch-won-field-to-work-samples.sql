-- Add pitch_won field to work_samples table
ALTER TABLE public.work_samples
ADD COLUMN IF NOT EXISTS pitch_won BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.work_samples.pitch_won IS 'Whether a pitch work sample was won (only relevant when type is Pitch)';

