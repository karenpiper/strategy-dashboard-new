-- App Settings table for feature toggles and configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
  ('horoscope_enabled', 'true', 'Enable/disable horoscope feature on dashboard'),
  ('horoscope_avatar_enabled', 'true', 'Enable/disable horoscope avatar image')
ON CONFLICT (setting_key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(setting_key);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can view settings
CREATE POLICY "Anyone authenticated can view app settings"
  ON public.app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can update settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS app_settings_updated_at_trigger ON public.app_settings;
CREATE TRIGGER app_settings_updated_at_trigger
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();




