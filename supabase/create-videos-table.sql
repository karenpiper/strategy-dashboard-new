-- Videos table for storing video content
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  platform TEXT, -- 'youtube', 'vimeo', 'direct', etc.
  duration INTEGER, -- Duration in seconds
  pinned BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_submitted_by ON public.videos(submitted_by);
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_tags ON public.videos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_pinned ON public.videos(pinned);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for videos
-- Anyone authenticated can view videos
CREATE POLICY "Anyone authenticated can view videos"
  ON public.videos FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only leaders and admins can insert videos
CREATE POLICY "Leaders and admins can insert videos"
  ON public.videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Only leaders and admins can update videos
CREATE POLICY "Leaders and admins can update videos"
  ON public.videos FOR UPDATE
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

-- Only leaders and admins can delete videos
CREATE POLICY "Leaders and admins can delete videos"
  ON public.videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

