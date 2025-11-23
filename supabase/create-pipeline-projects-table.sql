-- Pipeline Projects table
CREATE TABLE IF NOT EXISTS public.pipeline_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  due_date DATE,
  lead TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('In Progress', 'Pending Decision', 'Long Lead', 'Won', 'Lost')),
  team TEXT,
  url TEXT,
  tier INTEGER CHECK (tier >= 0 AND tier <= 3),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_status ON public.pipeline_projects(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_due_date ON public.pipeline_projects(due_date DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_created_by ON public.pipeline_projects(created_by);

-- Enable Row Level Security
ALTER TABLE public.pipeline_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pipeline_projects
DROP POLICY IF EXISTS "Users can view all pipeline projects" ON public.pipeline_projects;
DROP POLICY IF EXISTS "Users can insert pipeline projects" ON public.pipeline_projects;
DROP POLICY IF EXISTS "Users can update pipeline projects" ON public.pipeline_projects;
DROP POLICY IF EXISTS "Users can delete pipeline projects" ON public.pipeline_projects;

CREATE POLICY "Users can view all pipeline projects"
  ON public.pipeline_projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert pipeline projects"
  ON public.pipeline_projects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update pipeline projects"
  ON public.pipeline_projects FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete pipeline projects"
  ON public.pipeline_projects FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON COLUMN public.pipeline_projects.status IS 'Project status: In Progress, Pending Decision, Long Lead, Won, Lost';
COMMENT ON COLUMN public.pipeline_projects.tier IS 'Project tier: 0, 1, 2, or 3';
COMMENT ON COLUMN public.pipeline_projects.lead IS 'Comma-separated list of lead names';
COMMENT ON COLUMN public.pipeline_projects.team IS 'Comma-separated list of team member names';


