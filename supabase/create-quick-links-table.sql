-- Quick Links table for managing dashboard quick links
CREATE TABLE IF NOT EXISTS public.quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT, -- Icon name from lucide-react (e.g., 'Bot', 'MessageSquare', 'Briefcase')
  password TEXT, -- Optional password text to display below the link
  display_order INTEGER DEFAULT 0, -- Order in which links appear (lower = first)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quick_links_display_order ON public.quick_links(display_order);
CREATE INDEX IF NOT EXISTS idx_quick_links_is_active ON public.quick_links(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_links_created_by ON public.quick_links(created_by);

-- Enable Row Level Security
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can view active quick links
CREATE POLICY "Anyone authenticated can view active quick links"
  ON public.quick_links FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can view all quick links (including inactive)
CREATE POLICY "Admins can view all quick links"
  ON public.quick_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

-- Only admins can insert quick links
CREATE POLICY "Admins can insert quick links"
  ON public.quick_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

-- Only admins can update quick links
CREATE POLICY "Admins can update quick links"
  ON public.quick_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

-- Only admins can delete quick links
CREATE POLICY "Admins can delete quick links"
  ON public.quick_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );


