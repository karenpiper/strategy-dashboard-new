-- Analytics Events Table
-- Tracks user activity, logins, page views, and custom events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login', 'page_view', 'action', etc.
  event_name TEXT, -- Specific event name (e.g., 'viewed_team_page', 'clicked_snap_button')
  page_path TEXT, -- URL path where event occurred
  metadata JSONB, -- Additional event data (browser, device, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON public.analytics_events(page_path);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own events
CREATE POLICY "Users can insert their own analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can view analytics (will be restricted further in admin)
CREATE POLICY "Authenticated users can view analytics"
  ON public.analytics_events FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can view all analytics (check via profiles table)
-- Note: This policy allows authenticated users to view, but admin checks should be done in API routes
CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.base_role = 'admin'
    )
  );

