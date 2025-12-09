-- Dashboard Card Settings table
-- Stores visibility settings for dashboard cards (admin-only configuration)

CREATE TABLE IF NOT EXISTS public.dashboard_card_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_name TEXT NOT NULL UNIQUE,
  is_visible BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Insert default settings for all cards (all visible by default)
-- Only include cards that actually exist on the dashboard
INSERT INTO public.dashboard_card_settings (card_name, is_visible, display_order) VALUES
  ('beast-babe', true, 1),
  ('snaps', true, 2),
  ('horoscope', true, 3),
  ('team-pulse', true, 4),
  ('events', true, 5),
  ('pipeline', true, 6),
  ('this-week-stats', true, 7),
  ('recent-work', true, 8),
  ('playlist', true, 9),
  ('video', true, 10),
  ('must-reads', true, 11),
  ('search', true, 12)
ON CONFLICT (card_name) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_card_settings_card_name ON public.dashboard_card_settings(card_name);
CREATE INDEX IF NOT EXISTS idx_dashboard_card_settings_visible ON public.dashboard_card_settings(is_visible);

-- Enable Row Level Security
ALTER TABLE public.dashboard_card_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view card settings" ON public.dashboard_card_settings;
DROP POLICY IF EXISTS "Admins can update card settings" ON public.dashboard_card_settings;

-- Anyone authenticated can view (needed for frontend to check visibility)
CREATE POLICY "Anyone can view card settings"
  ON public.dashboard_card_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can update
CREATE POLICY "Admins can update card settings"
  ON public.dashboard_card_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.dashboard_card_settings IS 'Stores visibility settings for dashboard cards. Only admins can modify these settings.';
COMMENT ON COLUMN public.dashboard_card_settings.card_name IS 'Unique identifier for the card (e.g., horoscope, snaps, events)';
COMMENT ON COLUMN public.dashboard_card_settings.is_visible IS 'Whether the card should be displayed on the dashboard';
COMMENT ON COLUMN public.dashboard_card_settings.display_order IS 'Order in which cards should be displayed (lower numbers first)';

