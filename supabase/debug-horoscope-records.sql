-- Debug script to check horoscope records
-- Run this in Supabase SQL Editor

-- Check if there are ANY records in the horoscopes table
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(CASE WHEN horoscope_text IS NOT NULL AND horoscope_text != '' THEN 1 END) as records_with_text,
  COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as records_with_image
FROM horoscopes;

-- Check recent records (last 10)
SELECT 
  user_id,
  date,
  star_sign,
  LENGTH(horoscope_text) as text_length,
  horoscope_text IS NULL as text_is_null,
  horoscope_text = '' as text_is_empty,
  image_url IS NOT NULL as has_image,
  LENGTH(image_url) as image_url_length,
  generated_at,
  created_at
FROM horoscopes
ORDER BY generated_at DESC NULLS LAST, created_at DESC NULLS LAST
LIMIT 10;

-- Check today's records specifically
SELECT 
  user_id,
  date,
  CURRENT_DATE as today_date,
  date = CURRENT_DATE as is_today,
  star_sign,
  LENGTH(horoscope_text) as text_length,
  horoscope_text IS NULL as text_is_null,
  horoscope_text = '' as text_is_empty,
  image_url IS NOT NULL as has_image,
  generated_at
FROM horoscopes
WHERE date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY date DESC, generated_at DESC;

-- Check for a specific user (replace with your user ID)
-- First, get your user ID:
SELECT id, email FROM auth.users WHERE email = 'karen.piper@codeandtheory.com';

-- Then check that user's records:
-- SELECT * FROM horoscopes 
-- WHERE user_id = 'YOUR_USER_ID_HERE'
-- ORDER BY date DESC;

