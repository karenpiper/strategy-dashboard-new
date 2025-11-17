-- ============================================
-- HOROSCOPE CONFIGURATION SYSTEM SCHEMA
-- Three-layer architecture: Engine (code) + Config (DB) + Themes (DB)
-- ============================================

-- Rulesets table - for staging/prod environments
CREATE TABLE IF NOT EXISTS public.rulesets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- "default", "holiday_2025", "staging"
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Styles catalog - illustration styles
CREATE TABLE IF NOT EXISTS public.styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE, -- "oil_painting", "pixel_art", "watercolor"
  label TEXT NOT NULL, -- "Oil painting", "Pixel art", "Watercolor"
  family TEXT, -- "AnalogColor", "CharacterCartoon", "DigitalArt", etc
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Segments - traits that can be matched (sign, element, discipline, etc)
CREATE TABLE IF NOT EXISTS public.segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- "sign", "element", "discipline", "role_level", "weekday", "season"
  value TEXT NOT NULL, -- "Aries", "fire", "design", "senior", "Monday", "winter"
  description TEXT, -- for humans
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(type, value)
);

-- Rules - maps segments to style weights, character weights, prompt tags
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ruleset_id UUID REFERENCES public.rulesets(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  weight_styles_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "oil_painting": 1.5, "pixel_art": 0.5 }
  weight_character_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "human": 1.0, "animal": 0.3, "object": 0.1, "hybrid": 0.5 }
  prompt_tags_json JSONB DEFAULT '[]'::jsonb, -- ["playful", "messy", "deadline energy"]
  priority INTEGER DEFAULT 0, -- higher overrides lower
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Themes - daily or campaign themes
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  name TEXT NOT NULL,
  mood_tags_json JSONB DEFAULT '[]'::jsonb, -- ["hopeful", "chaotic", "soft"]
  text_snippet TEXT, -- "today everything is about unfinished work"
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Theme rules - optional overrides for specific segments within a theme
CREATE TABLE IF NOT EXISTS public.theme_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  weight_boost_json JSONB DEFAULT '{}'::jsonb, -- adjust weights further
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rules_ruleset_segment ON public.rules(ruleset_id, segment_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rules_segment ON public.rules(segment_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_segments_type_value ON public.segments(type, value);
CREATE INDEX IF NOT EXISTS idx_styles_active ON public.styles(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_themes_date_range ON public.themes(date_range_start, date_range_end) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_theme_rules_theme_segment ON public.theme_rules(theme_id, segment_id);

-- Enable RLS
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow public read for active items, admin write
-- For now, allow public read access (admin UI will handle writes with service role)
CREATE POLICY "Public can view active rulesets" ON public.rulesets FOR SELECT USING (active = true);
CREATE POLICY "Public can view active styles" ON public.styles FOR SELECT USING (active = true);
CREATE POLICY "Public can view segments" ON public.segments FOR SELECT USING (true);
CREATE POLICY "Public can view active rules" ON public.rules FOR SELECT USING (active = true);
CREATE POLICY "Public can view active themes" ON public.themes FOR SELECT USING (active = true);
CREATE POLICY "Public can view theme rules" ON public.theme_rules FOR SELECT USING (true);

