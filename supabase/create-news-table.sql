-- News table for storing team announcements and updates
CREATE TABLE IF NOT EXISTS public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT, -- Main content/body of the news item
  url TEXT, -- Optional external link
  category TEXT, -- e.g., 'Announcement', 'Update', 'Event', 'Policy', etc.
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  published_date DATE DEFAULT CURRENT_DATE, -- Date the news was published
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_news_submitted_by ON public.news(submitted_by);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category);
CREATE INDEX IF NOT EXISTS idx_news_tags ON public.news USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published_date ON public.news(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_pinned ON public.news(pinned);

-- Enable Row Level Security
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news
-- Anyone authenticated can view news
CREATE POLICY "Anyone authenticated can view news"
  ON public.news FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only leaders and admins can insert news
CREATE POLICY "Leaders and admins can insert news"
  ON public.news FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Only leaders and admins can update news
CREATE POLICY "Leaders and admins can update news"
  ON public.news FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Only leaders and admins can delete news
CREATE POLICY "Leaders and admins can delete news"
  ON public.news FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS news_updated_at_trigger ON public.news;
CREATE TRIGGER news_updated_at_trigger
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();






