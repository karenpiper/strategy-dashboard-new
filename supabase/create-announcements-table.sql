-- Announcements table for banner announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'text', -- 'text' or 'countdown'
  event_name TEXT, -- For countdown mode
  target_date DATE, -- For countdown mode
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE, -- When announcement expires
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(active);
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON public.announcements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can view active announcements
CREATE POLICY "Anyone authenticated can view active announcements"
  ON public.announcements FOR SELECT
  USING (auth.role() = 'authenticated' AND active = true);

-- Only leaders and admins can manage announcements
CREATE POLICY "Leaders and admins can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Leaders and admins can update announcements"
  ON public.announcements FOR UPDATE
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

CREATE POLICY "Leaders and admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role IN ('admin', 'leader')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS announcements_updated_at_trigger ON public.announcements;
CREATE TRIGGER announcements_updated_at_trigger
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();



