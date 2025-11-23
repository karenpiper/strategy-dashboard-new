-- Resources table for storing team resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  primary_category TEXT NOT NULL,
  secondary_tags TEXT[] DEFAULT '{}',
  link TEXT NOT NULL,
  source TEXT,
  description TEXT,
  username TEXT,
  password TEXT,
  instructions TEXT,
  documentation TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Resource views tracking table (for recently viewed and most used)
CREATE TABLE IF NOT EXISTS public.resource_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(resource_id, user_id, viewed_at)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_resources_primary_category ON public.resources(primary_category);
CREATE INDEX IF NOT EXISTS idx_resources_secondary_tags ON public.resources USING GIN(secondary_tags);
CREATE INDEX IF NOT EXISTS idx_resources_name ON public.resources(name);
CREATE INDEX IF NOT EXISTS idx_resource_views_resource_id ON public.resource_views(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_user_id ON public.resource_views(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_viewed_at ON public.resource_views(viewed_at);

-- Enable Row Level Security
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
DROP POLICY IF EXISTS "Anyone authenticated can view resources" ON public.resources;
DROP POLICY IF EXISTS "Anyone authenticated can update resource view count" ON public.resources;

CREATE POLICY "Anyone authenticated can view resources"
  ON public.resources FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can update resource view count"
  ON public.resources FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for resource_views
DROP POLICY IF EXISTS "Users can view their own resource views" ON public.resource_views;
DROP POLICY IF EXISTS "Users can insert their own resource views" ON public.resource_views;

CREATE POLICY "Users can view their own resource views"
  ON public.resource_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resource views"
  ON public.resource_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to increment resource view count
CREATE OR REPLACE FUNCTION increment_resource_view(resource_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.resources
  SET view_count = view_count + 1,
      last_viewed_at = TIMEZONE('utc', NOW())
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

