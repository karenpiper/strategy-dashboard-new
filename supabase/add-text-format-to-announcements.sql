-- Add text_format column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS text_format TEXT DEFAULT 'days_until';

-- Update existing countdown announcements to use default format
UPDATE public.announcements 
SET text_format = 'days_until' 
WHERE mode = 'countdown' AND text_format IS NULL;



