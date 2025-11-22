-- Migration: Copy assigned_to to submitted_by for existing must_reads records
-- This fixes records where submitted_by is null or incorrect but assigned_to has the correct value

-- Update records where submitted_by is NULL but assigned_to has a value
UPDATE public.must_reads
SET submitted_by = assigned_to
WHERE submitted_by IS NULL 
  AND assigned_to IS NOT NULL;

-- Also update records where submitted_by might be set to a default/wrong value
-- and assigned_to has the actual submitter
-- (This assumes assigned_to was being used to track who submitted)
UPDATE public.must_reads
SET submitted_by = assigned_to
WHERE assigned_to IS NOT NULL
  AND submitted_by IS DISTINCT FROM assigned_to;

-- Verify the migration
SELECT 
  id,
  article_title,
  submitted_by,
  assigned_to,
  created_at
FROM public.must_reads
ORDER BY created_at DESC
LIMIT 10;

