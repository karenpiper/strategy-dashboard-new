-- Import Users from CSV (Team-Grid view.csv)
-- This script updates existing user profiles based on email matching
-- Run this in Supabase SQL Editor
-- 
-- IMPORTANT NOTES:
-- 1. This script updates existing profiles only (matched by email)
-- 2. Users must already exist in auth.users for profiles to be updated
-- 3. For new users, you'll need to create auth.users first, then run this script
-- 4. Photo URLs are extracted from the format: "filename (https://url)"
-- 5. Birthday is converted from M/D/YYYY to MM/DD format
-- 6. Start Date is converted from M/D/YYYY to YYYY-MM-DD format
-- 7. Access field maps: "Admin" -> "admin", "Contributor" -> "contributor", "User" -> "user"
-- 8. Special access: "Curator" and "Lead" are added to special_access array if checked

-- Helper function to extract URL from photo field
CREATE OR REPLACE FUNCTION extract_photo_url(photo_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF photo_text IS NULL OR photo_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Extract URL from format: "filename (https://url)" or just "https://url"
  IF photo_text LIKE '%(https://%' THEN
    RETURN SUBSTRING(photo_text FROM '\(https://[^)]+\)');
  ELSIF photo_text LIKE '%(http://%' THEN
    RETURN SUBSTRING(photo_text FROM '\(http://[^)]+\)');
  ELSIF photo_text LIKE 'https://%' OR photo_text LIKE 'http://%' THEN
    RETURN photo_text;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to convert birthday from M/D/YYYY to MM/DD
CREATE OR REPLACE FUNCTION convert_birthday(birthday_text TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
  month_part TEXT;
  day_part TEXT;
BEGIN
  IF birthday_text IS NULL OR birthday_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Split by /
  parts := string_to_array(birthday_text, '/');
  
  IF array_length(parts, 1) >= 2 THEN
    month_part := LPAD(parts[1], 2, '0');
    day_part := LPAD(parts[2], 2, '0');
    RETURN month_part || '/' || day_part;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to convert start date from M/D/YYYY to YYYY-MM-DD
CREATE OR REPLACE FUNCTION convert_start_date(date_text TEXT)
RETURNS DATE AS $$
DECLARE
  parts TEXT[];
  year_part TEXT;
  month_part TEXT;
  day_part TEXT;
BEGIN
  IF date_text IS NULL OR date_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Split by /
  parts := string_to_array(date_text, '/');
  
  IF array_length(parts, 1) = 3 THEN
    month_part := LPAD(parts[1], 2, '0');
    day_part := LPAD(parts[2], 2, '0');
    year_part := parts[3];
    RETURN (year_part || '-' || month_part || '-' || day_part)::DATE;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to map access level to base_role
CREATE OR REPLACE FUNCTION map_base_role(access_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF access_text IS NULL OR access_text = '' THEN
    RETURN 'user';
  END IF;
  
  CASE LOWER(TRIM(access_text))
    WHEN 'admin' THEN RETURN 'admin';
    WHEN 'contributor' THEN RETURN 'contributor';
    WHEN 'leader' THEN RETURN 'leader';
    ELSE RETURN 'user';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to build special_access array
CREATE OR REPLACE FUNCTION build_special_access(curator_text TEXT, lead_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  access_array TEXT[] := '{}';
BEGIN
  IF LOWER(TRIM(curator_text)) = 'checked' THEN
    access_array := array_append(access_array, 'curator');
  END IF;
  
  IF LOWER(TRIM(lead_text)) = 'checked' THEN
    access_array := array_append(access_array, 'lead');
  END IF;
  
  RETURN access_array;
END;
$$ LANGUAGE plpgsql;

-- Update profiles based on CSV data
-- This uses a temporary table approach - you'll need to insert the CSV data first
-- Or use COPY command to import CSV into a temp table

-- Create temporary table for CSV data
CREATE TEMP TABLE IF NOT EXISTS csv_users (
  name TEXT,
  active TEXT,
  role TEXT,
  discipline TEXT,
  email TEXT,
  manager TEXT,
  photo TEXT,
  birthday TEXT,
  start_date TEXT,
  lead TEXT,
  code_ascope TEXT,
  password TEXT,
  last_login TEXT,
  curator TEXT,
  access TEXT,
  slack_id TEXT,
  location TEXT,
  bio TEXT,
  website TEXT
);

-- NOTE: You'll need to import your CSV into csv_users table first
-- You can do this via Supabase dashboard or using COPY command:
-- COPY csv_users FROM '/path/to/Team-Grid view.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Now update existing profiles
UPDATE public.profiles p
SET
  full_name = COALESCE(NULLIF(TRIM(c.name), ''), p.full_name),
  email = COALESCE(NULLIF(TRIM(c.email), ''), p.email),
  role = COALESCE(NULLIF(TRIM(c.role), ''), p.role),
  discipline = COALESCE(NULLIF(TRIM(c.discipline), ''), p.discipline),
  avatar_url = COALESCE(extract_photo_url(c.photo), p.avatar_url),
  birthday = COALESCE(convert_birthday(c.birthday), p.birthday),
  start_date = COALESCE(convert_start_date(c.start_date), p.start_date),
  location = COALESCE(NULLIF(TRIM(c.location), ''), p.location),
  bio = COALESCE(NULLIF(TRIM(c.bio), ''), p.bio),
  website = COALESCE(NULLIF(TRIM(c.website), ''), p.website),
  base_role = COALESCE(map_base_role(c.access), p.base_role),
  special_access = COALESCE(
    CASE 
      WHEN c.curator IS NOT NULL OR c.lead IS NOT NULL 
      THEN build_special_access(c.curator, c.lead)
      ELSE p.special_access
    END,
    p.special_access
  ),
  updated_at = TIMEZONE('utc', NOW())
FROM csv_users c
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(c.email))
  AND c.email IS NOT NULL
  AND TRIM(c.email) != '';

-- Show summary of updates
SELECT 
  COUNT(*) as updated_profiles,
  COUNT(CASE WHEN c.email IS NOT NULL THEN 1 END) as total_csv_users,
  COUNT(CASE WHEN p.id IS NULL THEN 1 END) as users_not_found
FROM csv_users c
LEFT JOIN public.profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(c.email))
WHERE c.email IS NOT NULL AND TRIM(c.email) != '';

-- Show users that were not found (need to be created in auth.users first)
SELECT 
  c.name,
  c.email,
  c.role,
  c.discipline
FROM csv_users c
LEFT JOIN public.profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(c.email))
WHERE p.id IS NULL
  AND c.email IS NOT NULL
  AND TRIM(c.email) != ''
ORDER BY c.name;

-- Clean up helper functions (optional - comment out if you want to keep them)
-- DROP FUNCTION IF EXISTS extract_photo_url(TEXT);
-- DROP FUNCTION IF EXISTS convert_birthday(TEXT);
-- DROP FUNCTION IF EXISTS convert_start_date(TEXT);
-- DROP FUNCTION IF EXISTS map_base_role(TEXT);
-- DROP FUNCTION IF EXISTS build_special_access(TEXT, TEXT);


