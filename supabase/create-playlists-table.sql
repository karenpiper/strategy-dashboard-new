-- Playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  date DATE NOT NULL,
  title TEXT,
  curator TEXT NOT NULL,
  description TEXT,
  spotify_url TEXT NOT NULL,
  apple_playlist_url TEXT,
  cover_url TEXT, -- Spotify playlist cover image
  curator_photo_url TEXT, -- Curator's avatar URL (from profiles)
  week_label TEXT -- Optional label like "This Week", "Last Week", etc.
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_playlists_date ON public.playlists(date DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_curator ON public.playlists(curator);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON public.playlists(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view playlists
CREATE POLICY "Anyone can view playlists"
  ON public.playlists FOR SELECT
  USING (true);

-- Only admins/curators can insert playlists
CREATE POLICY "Admins and curators can insert playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.base_role IN ('admin', 'leader') OR 'curator' = ANY(profiles.special_access))
    )
  );

-- Only admins/curators can update playlists
CREATE POLICY "Admins and curators can update playlists"
  ON public.playlists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.base_role IN ('admin', 'leader') OR 'curator' = ANY(profiles.special_access))
    )
  );

-- Only admins can delete playlists
CREATE POLICY "Only admins can delete playlists"
  ON public.playlists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage all playlists"
  ON public.playlists
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_playlists_updated_at();


