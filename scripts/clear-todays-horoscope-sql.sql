-- SQL script to clear today's horoscope cache
-- Run this in Supabase SQL Editor to force regeneration with new slot-based system
-- Replace 'YOUR_USER_ID' with your actual user ID, or remove the WHERE clause to clear for all users

-- Option 1: Clear for a specific user
DELETE FROM public.horoscopes
WHERE user_id = 'YOUR_USER_ID'::uuid
  AND date = CURRENT_DATE;

-- Option 2: Clear for all users (today only)
-- DELETE FROM public.horoscopes
-- WHERE date = CURRENT_DATE;

-- Option 3: Clear user_avatar_state to reset rotation history
-- DELETE FROM public.user_avatar_state
-- WHERE user_id = 'YOUR_USER_ID'::uuid;

