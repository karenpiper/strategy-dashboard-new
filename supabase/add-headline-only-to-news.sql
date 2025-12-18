-- Add headline_only column to news table
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS headline_only BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_headline_only ON public.news(headline_only);



