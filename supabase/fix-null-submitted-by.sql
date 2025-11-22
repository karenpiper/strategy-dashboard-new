-- Fix records where submitted_by should be NULL but has a value
-- This sets submitted_by to NULL for records that don't have an assigned_to value
-- (assuming articles without assigned_to should also have null submitted_by)

-- Option 1: Set submitted_by to NULL where assigned_to is NULL
-- (if articles without assigned_to should have null submitted_by)
UPDATE public.must_reads
SET submitted_by = NULL
WHERE assigned_to IS NULL
  AND submitted_by IS NOT NULL;

-- Option 2: If you want to keep submitted_by separate from assigned_to,
-- you might want to only fix records where both are null but submitted_by has a value
-- Uncomment this if Option 1 doesn't match your needs:
-- UPDATE public.must_reads
-- SET submitted_by = NULL
-- WHERE submitted_by IS NOT NULL
--   AND assigned_to IS NULL
--   AND created_at < '2024-01-01'; -- Adjust date as needed

-- Verify the fix
SELECT 
  id,
  article_title,
  submitted_by,
  assigned_to,
  created_at
FROM public.must_reads
WHERE assigned_to IS NULL
ORDER BY created_at DESC
LIMIT 20;

