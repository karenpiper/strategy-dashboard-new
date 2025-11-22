-- Work Sample Types table - stores the types/categories
CREATE TABLE IF NOT EXISTS public.work_sample_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Insert default types (alphabetically)
INSERT INTO public.work_sample_types (name) VALUES
  ('Brand'),
  ('Campaign'),
  ('Consulting'),
  ('Content'),
  ('Digital'),
  ('Pitch'),
  ('Product'),
  ('Research'),
  ('Strategy')
ON CONFLICT (name) DO NOTHING;

-- Work Samples table
CREATE TABLE IF NOT EXISTS public.work_samples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  type_id UUID REFERENCES public.work_sample_types(id) ON DELETE SET NULL,
  client TEXT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_samples_type_id ON public.work_samples(type_id);
CREATE INDEX IF NOT EXISTS idx_work_samples_author_id ON public.work_samples(author_id);
CREATE INDEX IF NOT EXISTS idx_work_samples_created_by ON public.work_samples(created_by);
CREATE INDEX IF NOT EXISTS idx_work_samples_date ON public.work_samples(date DESC);
CREATE INDEX IF NOT EXISTS idx_work_sample_types_name ON public.work_sample_types(name);

-- Enable Row Level Security
ALTER TABLE public.work_sample_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_sample_types
DROP POLICY IF EXISTS "Users can view all work sample types" ON public.work_sample_types;
DROP POLICY IF EXISTS "Users can insert work sample types" ON public.work_sample_types;

CREATE POLICY "Users can view all work sample types"
  ON public.work_sample_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert work sample types"
  ON public.work_sample_types FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for work_samples
DROP POLICY IF EXISTS "Users can view all work samples" ON public.work_samples;
DROP POLICY IF EXISTS "Users can insert work samples" ON public.work_samples;
DROP POLICY IF EXISTS "Users can update work samples" ON public.work_samples;
DROP POLICY IF EXISTS "Users can delete work samples" ON public.work_samples;

CREATE POLICY "Users can view all work samples"
  ON public.work_samples FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert work samples"
  ON public.work_samples FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update work samples"
  ON public.work_samples FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete work samples"
  ON public.work_samples FOR DELETE
  USING (auth.role() = 'authenticated');

