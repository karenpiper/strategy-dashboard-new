-- Add working_days_only column to announcements table
-- This allows countdowns to exclude weekends from the day count

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS working_days_only BOOLEAN DEFAULT false;

-- Update existing countdown announcements to use all days by default
UPDATE public.announcements
SET working_days_only = false
WHERE mode = 'countdown' AND working_days_only IS NULL;


