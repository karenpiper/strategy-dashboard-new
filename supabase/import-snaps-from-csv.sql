-- Import Snaps from CSV
-- This script imports snaps from the CSV file
-- 
-- IMPORTANT: Before running this script, you need to import the CSV data into a staging table.
-- Option 1: Use Supabase Dashboard -> Table Editor -> Import CSV to create a table called 'snaps_staging'
-- Option 2: Use the COPY command if you have file access (see instructions below)
--
-- CSV Format: Date,Snap Content,Mentioned,Submitted By

-- Step 1: Create staging table (if not exists)
-- Note: Column names match CSV headers exactly (with spaces)
CREATE TABLE IF NOT EXISTS public.snaps_staging (
  "Date" TEXT,
  "Snap Content" TEXT,
  "Mentioned" TEXT,
  "Submitted By" TEXT
);

-- Step 2: If using COPY command (requires file access):
-- COPY public.snaps_staging("Date", "Snap Content", "Mentioned", "Submitted By")
-- FROM '/path/to/Snaps-Grid view.csv'
-- WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Step 3: Helper function to parse date from various formats (M/D/YYYY, M/DD/YYYY, etc.)
CREATE OR REPLACE FUNCTION parse_snap_date(date_str TEXT)
RETURNS DATE AS $$
DECLARE
  parsed_date DATE;
  month_part TEXT;
  day_part TEXT;
  year_part TEXT;
  parts TEXT[];
BEGIN
  IF date_str IS NULL OR TRIM(date_str) = '' THEN
    RETURN CURRENT_DATE;
  END IF;
  
  -- Try to parse M/D/YYYY or M/DD/YYYY format
  parts := string_to_array(TRIM(date_str), '/');
  
  IF array_length(parts, 1) = 3 THEN
    month_part := parts[1];
    day_part := parts[2];
    year_part := parts[3];
    
    -- Validate and construct date
    IF LENGTH(month_part) <= 2 AND LENGTH(day_part) <= 2 AND LENGTH(year_part) = 4 THEN
      BEGIN
        parsed_date := TO_DATE(year_part || '-' || LPAD(month_part, 2, '0') || '-' || LPAD(day_part, 2, '0'), 'YYYY-MM-DD');
        RETURN parsed_date;
      EXCEPTION WHEN OTHERS THEN
        -- If parsing fails, try native date parsing
        BEGIN
          RETURN date_str::DATE;
        EXCEPTION WHEN OTHERS THEN
          RETURN CURRENT_DATE;
        END;
      END;
    END IF;
  END IF;
  
  -- Try native date parsing as fallback
  BEGIN
    RETURN date_str::DATE;
  EXCEPTION WHEN OTHERS THEN
    RETURN CURRENT_DATE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Helper function to find profile ID by name (fuzzy matching)
CREATE OR REPLACE FUNCTION find_profile_by_name(name_text TEXT)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try exact match (case-insensitive)
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(name_text))
  LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Try partial match
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE LOWER(full_name) LIKE '%' || LOWER(TRIM(name_text)) || '%'
  LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Try matching first name or last name
  IF POSITION(' ' IN TRIM(name_text)) > 0 THEN
    SELECT id INTO profile_id
    FROM public.profiles
    WHERE LOWER(full_name) LIKE LOWER(SPLIT_PART(TRIM(name_text), ' ', 1)) || '%'
    LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Import snaps from staging table
DO $$
DECLARE
  staging_record RECORD;
  snap_date DATE;
  mentioned_user_id UUID;
  submitted_by_id UUID;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
  matched_mentioned INTEGER := 0;
  matched_submitted_by INTEGER := 0;
BEGIN
  -- Loop through staging table
  FOR staging_record IN 
    SELECT * FROM public.snaps_staging
    WHERE TRIM("Snap Content") != ''
  LOOP
    -- Parse date
    snap_date := parse_snap_date(staging_record."Date");
    
    -- Find mentioned user
    mentioned_user_id := find_profile_by_name(staging_record."Mentioned");
    IF mentioned_user_id IS NOT NULL THEN
      matched_mentioned := matched_mentioned + 1;
    END IF;
    
    -- Find submitted_by user
    submitted_by_id := find_profile_by_name(staging_record."Submitted By");
    IF submitted_by_id IS NOT NULL THEN
      matched_submitted_by := matched_submitted_by + 1;
    END IF;
    
    -- Insert into snaps table
    BEGIN
      INSERT INTO public.snaps (
        date,
        snap_content,
        mentioned,
        mentioned_user_id,
        submitted_by
      ) VALUES (
        snap_date,
        TRIM(staging_record."Snap Content"),
        CASE WHEN TRIM(staging_record."Mentioned") = '' THEN NULL ELSE TRIM(staging_record."Mentioned") END,
        mentioned_user_id,
        submitted_by_id  -- NULL for anonymous if not found
      );
      
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped_count := skipped_count + 1;
      RAISE NOTICE 'Error inserting snap: %', SQLERRM;
    END;
  END LOOP;
  
  -- Report results
  RAISE NOTICE 'Import complete!';
  RAISE NOTICE 'Inserted: %', inserted_count;
  RAISE NOTICE 'Skipped: %', skipped_count;
  RAISE NOTICE 'Matched mentioned users: %', matched_mentioned;
  RAISE NOTICE 'Matched submitted_by users: %', matched_submitted_by;
END;
$$;

-- Step 6: Clean up staging table (optional - uncomment if you want to remove it after import)
-- DROP TABLE IF EXISTS public.snaps_staging;

-- Step 7: Verify import
SELECT 
  COUNT(*) as total_snaps,
  COUNT(DISTINCT mentioned_user_id) as unique_mentioned_users,
  COUNT(DISTINCT submitted_by) as unique_submitters,
  COUNT(CASE WHEN submitted_by IS NULL THEN 1 END) as anonymous_snaps
FROM public.snaps;

