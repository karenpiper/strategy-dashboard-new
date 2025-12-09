-- Add image_url column to news table
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS image_url TEXT;

