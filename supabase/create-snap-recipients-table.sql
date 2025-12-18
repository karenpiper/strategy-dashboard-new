-- Snap Recipients Junction Table
-- Allows a single snap to be associated with multiple recipients
CREATE TABLE IF NOT EXISTS public.snap_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snap_id UUID NOT NULL REFERENCES public.snaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(snap_id, user_id) -- Prevent duplicate recipients for the same snap
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_snap_recipients_snap_id ON public.snap_recipients(snap_id);
CREATE INDEX IF NOT EXISTS idx_snap_recipients_user_id ON public.snap_recipients(user_id);

-- Enable Row Level Security
ALTER TABLE public.snap_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all snap recipients" ON public.snap_recipients;
DROP POLICY IF EXISTS "Users can insert snap recipients" ON public.snap_recipients;
DROP POLICY IF EXISTS "Users can delete snap recipients" ON public.snap_recipients;

-- All authenticated users can view snap recipients
CREATE POLICY "Users can view all snap recipients"
  ON public.snap_recipients FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can insert snap recipients
CREATE POLICY "Users can insert snap recipients"
  ON public.snap_recipients FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- All authenticated users can delete snap recipients
CREATE POLICY "Users can delete snap recipients"
  ON public.snap_recipients FOR DELETE
  USING (auth.role() = 'authenticated');

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage all snap recipients"
  ON public.snap_recipients
  USING (auth.role() = 'service_role');




