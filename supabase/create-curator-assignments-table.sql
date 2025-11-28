-- Curator assignments table
-- Tracks curator assignments to ensure fair rotation
-- Curators are assigned for specific weeks/dates and get curator permissions
CREATE TABLE IF NOT EXISTS public.curator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  curator_name TEXT NOT NULL,
  curator_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_date DATE NOT NULL, -- Date when curator is selected/notified
  start_date DATE NOT NULL, -- Date when curation period starts (assignment_date + 3 days)
  end_date DATE NOT NULL, -- Date when curation period ends (start_date + 7 days)
  is_manual_override BOOLEAN DEFAULT false,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(playlist_id) -- Only one assignment per playlist if playlist_id is set
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_curator_assignments_date ON public.curator_assignments(assignment_date DESC);
CREATE INDEX IF NOT EXISTS idx_curator_assignments_curator_name ON public.curator_assignments(curator_name);
CREATE INDEX IF NOT EXISTS idx_curator_assignments_profile_id ON public.curator_assignments(curator_profile_id);

-- Enable Row Level Security
ALTER TABLE public.curator_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view curator assignments
CREATE POLICY "Anyone can view curator assignments"
  ON public.curator_assignments FOR SELECT
  USING (true);

-- Only admins/leaders can insert curator assignments
CREATE POLICY "Admins and leaders can insert curator assignments"
  ON public.curator_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Only admins/leaders can update curator assignments
CREATE POLICY "Admins and leaders can update curator assignments"
  ON public.curator_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Only admins can delete curator assignments
CREATE POLICY "Only admins can delete curator assignments"
  ON public.curator_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

-- Function to get recent curator assignments (for rotation tracking)
CREATE OR REPLACE FUNCTION get_recent_curators(days_back INTEGER DEFAULT 365)
RETURNS TABLE (
  curator_name TEXT,
  assignment_date DATE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.curator_name,
    ca.assignment_date,
    COUNT(*) as count
  FROM public.curator_assignments ca
  WHERE ca.assignment_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY ca.curator_name, ca.assignment_date
  ORDER BY ca.assignment_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

