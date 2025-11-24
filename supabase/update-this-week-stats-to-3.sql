-- Update This Week Stats table to support 3 stats instead of 4
-- First, drop the existing constraint
ALTER TABLE public.this_week_stats DROP CONSTRAINT IF EXISTS this_week_stats_position_check;

-- Update the position constraint to allow only 1-3
ALTER TABLE public.this_week_stats ADD CONSTRAINT this_week_stats_position_check 
  CHECK (position >= 1 AND position <= 3);

-- Delete any existing stat at position 4
DELETE FROM public.this_week_stats WHERE position = 4;

-- Update comments
COMMENT ON TABLE public.this_week_stats IS 'Configuration for the 3 stats displayed in the "This Week" card on the dashboard';
COMMENT ON COLUMN public.this_week_stats.position IS 'Position of the stat (1-3)';

