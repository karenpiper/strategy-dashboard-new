-- Inspiration table for storing inspiration content (Pinterest-style, websites, images, etc.)
CREATE TABLE IF NOT EXISTS public.inspiration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  image_url TEXT, -- For images, screenshots, or thumbnails
  content_type TEXT, -- 'image', 'website', 'pinterest', 'video', 'article', etc.
  category TEXT, -- Optional categorization
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inspiration_submitted_by ON public.inspiration(submitted_by);
CREATE INDEX IF NOT EXISTS idx_inspiration_category ON public.inspiration(category);
CREATE INDEX IF NOT EXISTS idx_inspiration_content_type ON public.inspiration(content_type);
CREATE INDEX IF NOT EXISTS idx_inspiration_tags ON public.inspiration USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_inspiration_created_at ON public.inspiration(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspiration_pinned ON public.inspiration(pinned);

-- Enable Row Level Security
ALTER TABLE public.inspiration ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspiration
-- Anyone authenticated can view inspiration
CREATE POLICY "Anyone authenticated can view inspiration"
  ON public.inspiration FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anyone authenticated can insert inspiration
CREATE POLICY "Anyone authenticated can insert inspiration"
  ON public.inspiration FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own inspiration, admins/leaders can update any
CREATE POLICY "Users can update inspiration"
  ON public.inspiration FOR UPDATE
  USING (
    auth.uid() = submitted_by OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Users can delete their own inspiration, admins/leaders can delete any
CREATE POLICY "Users can delete inspiration"
  ON public.inspiration FOR DELETE
  USING (
    auth.uid() = submitted_by OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );


