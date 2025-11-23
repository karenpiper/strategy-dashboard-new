-- Playground Tools Table
-- Directory of tools for better thinking, doing, strategizing, managing, leading, etc.

CREATE TABLE IF NOT EXISTS public.playground_tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT, -- External link to the tool
  file_url TEXT, -- Uploaded file URL (stored in Supabase Storage)
  made_by_user BOOLEAN DEFAULT FALSE, -- Checkbox: did the submitter make this tool?
  description TEXT,
  why_i_like_it TEXT, -- Why the submitter likes it
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date_submitted TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  tags TEXT[], -- Array of tags (open)
  category TEXT, -- Category (TBD - can be null for now)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Playground Tool Comments Table
CREATE TABLE IF NOT EXISTS public.playground_tool_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.playground_tools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Playground Tool Likes Table
CREATE TABLE IF NOT EXISTS public.playground_tool_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.playground_tools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(tool_id, user_id) -- Prevent duplicate likes
);

-- Playground Tool Feedback Table (for tools made by users)
CREATE TABLE IF NOT EXISTS public.playground_tool_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID REFERENCES public.playground_tools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('feature_suggestion', 'bug_report', 'general_feedback')),
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.playground_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_tool_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_tool_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_tool_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playground_tools
-- Anyone authenticated can view tools
CREATE POLICY "Anyone authenticated can view tools"
  ON public.playground_tools FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anyone authenticated can create tools
CREATE POLICY "Anyone authenticated can create tools"
  ON public.playground_tools FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own tools
CREATE POLICY "Users can update own tools"
  ON public.playground_tools FOR UPDATE
  USING (auth.uid() = submitted_by)
  WITH CHECK (auth.uid() = submitted_by);

-- Users can delete their own tools
CREATE POLICY "Users can delete own tools"
  ON public.playground_tools FOR DELETE
  USING (auth.uid() = submitted_by);

-- Service role can do everything
CREATE POLICY "Service role can manage all tools"
  ON public.playground_tools
  USING (auth.role() = 'service_role');

-- RLS Policies for playground_tool_comments
-- Anyone authenticated can view comments
CREATE POLICY "Anyone authenticated can view comments"
  ON public.playground_tool_comments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anyone authenticated can create comments
CREATE POLICY "Anyone authenticated can create comments"
  ON public.playground_tool_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.playground_tool_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.playground_tool_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playground_tool_likes
-- Anyone authenticated can view likes
CREATE POLICY "Anyone authenticated can view likes"
  ON public.playground_tool_likes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anyone authenticated can like/unlike
CREATE POLICY "Anyone authenticated can like tools"
  ON public.playground_tool_likes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can unlike tools"
  ON public.playground_tool_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playground_tool_feedback
-- Anyone authenticated can view feedback
CREATE POLICY "Anyone authenticated can view feedback"
  ON public.playground_tool_feedback FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anyone authenticated can create feedback
CREATE POLICY "Anyone authenticated can create feedback"
  ON public.playground_tool_feedback FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON public.playground_tool_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON public.playground_tool_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playground_tools_submitted_by ON public.playground_tools(submitted_by);
CREATE INDEX IF NOT EXISTS idx_playground_tools_date_submitted ON public.playground_tools(date_submitted DESC);
CREATE INDEX IF NOT EXISTS idx_playground_tools_category ON public.playground_tools(category);
CREATE INDEX IF NOT EXISTS idx_playground_tool_comments_tool_id ON public.playground_tool_comments(tool_id);
CREATE INDEX IF NOT EXISTS idx_playground_tool_likes_tool_id ON public.playground_tool_likes(tool_id);
CREATE INDEX IF NOT EXISTS idx_playground_tool_feedback_tool_id ON public.playground_tool_feedback(tool_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_playground_tools_updated_at
  BEFORE UPDATE ON public.playground_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playground_tool_comments_updated_at
  BEFORE UPDATE ON public.playground_tool_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playground_tool_feedback_updated_at
  BEFORE UPDATE ON public.playground_tool_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

