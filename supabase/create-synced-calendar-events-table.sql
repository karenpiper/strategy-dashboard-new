-- Synced Calendar Events Table
-- Stores calendar events synced from Google Calendar using service account
-- These events are synced in the background and served to users without requiring OAuth

CREATE TABLE IF NOT EXISTS public.synced_calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_event_id TEXT NOT NULL, -- Google Calendar event ID
  calendar_id TEXT NOT NULL, -- Google Calendar ID
  calendar_name TEXT, -- Calendar name (cached from Google)
  summary TEXT NOT NULL,
  description TEXT,
  start_date_time TIMESTAMP WITH TIME ZONE, -- For timed events
  start_date DATE, -- For all-day events
  end_date_time TIMESTAMP WITH TIME ZONE, -- For timed events
  end_date DATE, -- For all-day events
  location TEXT,
  is_all_day BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete for events that no longer exist
  
  -- Unique constraint: one event per calendar per Google event ID
  UNIQUE(google_event_id, calendar_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_calendar_id ON public.synced_calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_start_date ON public.synced_calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_start_date_time ON public.synced_calendar_events(start_date_time);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_deleted_at ON public.synced_calendar_events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_dates ON public.synced_calendar_events(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_synced_calendar_events_date_times ON public.synced_calendar_events(start_date_time, end_date_time) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.synced_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view synced calendar events" ON public.synced_calendar_events;
DROP POLICY IF EXISTS "Service role can manage synced calendar events" ON public.synced_calendar_events;

-- All authenticated users can view synced calendar events (non-deleted only)
CREATE POLICY "Users can view synced calendar events"
  ON public.synced_calendar_events FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Service role can do everything (for sync operations)
CREATE POLICY "Service role can manage synced calendar events"
  ON public.synced_calendar_events
  USING (auth.role() = 'service_role');


