-- Seed Quick Links with current hardcoded links
-- Run this after creating the quick_links table (create-quick-links-table.sql)

-- This script will automatically find the first admin user and use their ID
-- If you want to use a specific user ID, replace (SELECT id FROM...) with the UUID

-- Browse Work
INSERT INTO public.quick_links (label, url, icon_name, password, display_order, is_active, created_by)
SELECT 
  'Browse Work', 
  '/work-samples', 
  'Briefcase', 
  NULL, 
  1, 
  true, 
  (SELECT id FROM public.profiles WHERE base_role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.quick_links WHERE label = 'Browse Work');

-- Just Vibes (scrolls to playlist section - use special URL)
INSERT INTO public.quick_links (label, url, icon_name, password, display_order, is_active, created_by)
SELECT 
  'Just Vibes', 
  'playlist-section', 
  'Music', 
  NULL, 
  2, 
  true, 
  (SELECT id FROM public.profiles WHERE base_role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.quick_links WHERE label = 'Just Vibes');

-- Grail
INSERT INTO public.quick_links (label, url, icon_name, password, display_order, is_active, created_by)
SELECT 
  'Grail', 
  'https://grail.codeandtheory.net/', 
  'Clock', 
  NULL, 
  3, 
  true, 
  (SELECT id FROM public.profiles WHERE base_role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.quick_links WHERE label = 'Grail');

-- Brief
INSERT INTO public.quick_links (label, url, icon_name, password, display_order, is_active, created_by)
SELECT 
  'Brief', 
  'https://docs.google.com/document/d/1veJeGAgkhFgVqgdOs1qnH08YxFIDti_bEA0HXsSBq4s/edit?tab=t.0', 
  'FileText', 
  NULL, 
  4, 
  true, 
  (SELECT id FROM public.profiles WHERE base_role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.quick_links WHERE label = 'Brief');

-- AI Resource Library
INSERT INTO public.quick_links (label, url, icon_name, password, display_order, is_active, created_by)
SELECT 
  'AI Resource Library', 
  'https://v0-oy-tqp-vjks-hi.vercel.app/', 
  'Bot', 
  'password: codeandtheory', 
  5, 
  true, 
  (SELECT id FROM public.profiles WHERE base_role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.quick_links WHERE label = 'AI Resource Library');

-- DeckTalk (opens chatbot - use special URL)
INSERT INTO public.quick_links (label, url, icon_name, password, display_order, is_active, created_by)
SELECT 
  'DeckTalk', 
  'chatbot', 
  'MessageSquare', 
  NULL, 
  6, 
  true, 
  (SELECT id FROM public.profiles WHERE base_role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.quick_links WHERE label = 'DeckTalk');

