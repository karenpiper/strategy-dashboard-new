-- Add revenue field to pipeline_projects table
ALTER TABLE public.pipeline_projects
ADD COLUMN IF NOT EXISTS revenue NUMERIC(12, 2);

-- Add comment for documentation
COMMENT ON COLUMN public.pipeline_projects.revenue IS 'Project revenue in dollars (can be null for opportunities without revenue yet)';

