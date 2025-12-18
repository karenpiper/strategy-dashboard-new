-- Add sticker_url column to announcements table for breaker GIF/sticker
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS sticker_url TEXT;



