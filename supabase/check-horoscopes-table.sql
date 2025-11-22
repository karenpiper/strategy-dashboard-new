-- Check if horoscopes table exists and has the correct structure
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'horoscopes'
) as table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'horoscopes'
ORDER BY ordinal_position;

-- 3. Check unique constraint
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.horoscopes'::regclass
AND contype = 'u';

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'horoscopes';

-- 5. Check if there are ANY records at all
SELECT COUNT(*) as total_records FROM horoscopes;

-- 6. Check recent records (if any exist)
SELECT 
  id,
  user_id,
  date,
  star_sign,
  LENGTH(horoscope_text) as text_length,
  LENGTH(image_url) as image_url_length,
  generated_at,
  created_at
FROM horoscopes
ORDER BY created_at DESC
LIMIT 5;

