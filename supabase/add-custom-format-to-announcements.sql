-- Add custom_format column to announcements table for free text with variables
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS custom_format TEXT;



