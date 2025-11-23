-- Add view tracking to playground tools

-- Add view_count column to playground_tools
ALTER TABLE public.playground_tools 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create playground_tool_views table to track individual views
CREATE TABLE IF NOT EXISTS public.playground_tool_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.playground_tools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(tool_id, user_id, DATE(viewed_at)) -- One view per user per day
);

-- Enable Row Level Security
ALTER TABLE public.playground_tool_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playground_tool_views
-- Anyone authenticated can view views
CREATE POLICY "Anyone authenticated can view views"
  ON public.playground_tool_views FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anyone authenticated can create views
CREATE POLICY "Anyone authenticated can create views"
  ON public.playground_tool_views FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playground_tool_views_tool_id ON public.playground_tool_views(tool_id);
CREATE INDEX IF NOT EXISTS idx_playground_tool_views_user_id ON public.playground_tool_views(user_id);
CREATE INDEX IF NOT EXISTS idx_playground_tool_views_viewed_at ON public.playground_tool_views(viewed_at DESC);

-- Function to increment view_count when a view is recorded
CREATE OR REPLACE FUNCTION increment_playground_tool_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.playground_tools
  SET view_count = view_count + 1
  WHERE id = NEW.tool_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment view_count
CREATE TRIGGER increment_playground_tool_view_count_trigger
  AFTER INSERT ON public.playground_tool_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_playground_tool_view_count();

