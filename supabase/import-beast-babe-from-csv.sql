-- Import Beast Babe History from CSV
-- This script imports beast babe history from the CSV file
-- 
-- CSV Format: Date,Person,Achievement

-- Step 1: Create staging table (if not exists)
CREATE TABLE IF NOT EXISTS public.beast_babe_staging (
  "Date" TEXT,
  "Person" TEXT,
  "Achievement" TEXT
);

-- Step 2: Insert CSV data into staging table
-- Note: You can also import via Supabase Dashboard -> Table Editor -> Import CSV
INSERT INTO public.beast_babe_staging ("Date", "Person", "Achievement") VALUES
('8/11/2025', 'Arjun Kalyanpur', 'Arjun is the beast babe because everything seems to come to him by default - he''s the hand-raiser, the energy, the natural leader. For our strategy leadership calls, he takes on extra and de facto leads initiatives - he''s the forward momentum.'),
('8/18/2025', 'Arjun Kalyanpur', 'Arjun is the beast babe because everything seems to come to him by default - he''s the hand-raiser, the energy, the natural leader. For our strategy leadership calls, he takes on extra and de facto leads initiatives - he''s the forward momentum.'),
('9/10/2025', 'Sophia Diaz', 'Sophia flies under the radar: you may not hear about all they do because they do it so quietly—despite it being some of the best, most thoughtful work we produce. They''re a silent assassin, whether on Microsoft or Maura, and a shining example of how we''re able to be as successful as we are.'),
('9/26/2025', 'Scott Lindenbaum', 'He is the example of what it means to lead with clarity, intelligence, and kindness. Any time I have a problem on a project - whether it be client relations, unpacking a business problem, or handling swirl - he''s able to help me get to a solution or best next step within 5 minutes. Besides being a great manager, I feel like this captures what it''s like to work with him. He makes you feel heard and understood, and helps get to the truth of problems quickly. King.'),
('10/10/2025', 'Karen Campos', 'Karen gets this week''s Beast Babe for swinging into SIFMA to get us back on track and bring all the disciplines together with grace and poise.'),
('10/16/2025', 'Liv Ranieri', 'or launching Flyers successfully and ensuring clear functional documentation and working with a large dev team while partnering with Challet to build her up. Liv has continuously created documentation that is quickly becoming the gold standard for how we should document'),
('10/24/2025', 'Shreiya Chowdhary', 'for her exceptional work on the Philadelphia Flyers app. It''s pretty remarkable this was her first project at Code and she has already made a big impact. It was a please to collaborate with her and the project is in great hands for their post launch support contract.'),
('11/13/2025', 'Arthur Alves Martinho', 'It''s for steering both the dev team in India and the design and client conversations for 4 full sprints with so much clarity and calm- all while juggling multiple projects. His organisation and openness really pulled the team through without an India PM and made everything feel possible.');

-- Step 3: Helper function to parse date from M/D/YYYY format
CREATE OR REPLACE FUNCTION parse_beast_babe_date(date_str TEXT)
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
        RETURN CURRENT_DATE;
      END;
    END IF;
  END IF;
  
  -- Fallback: try native date parsing
  BEGIN
    parsed_date := date_str::DATE;
    RETURN parsed_date;
  EXCEPTION WHEN OTHERS THEN
    RETURN CURRENT_DATE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Helper function to find profile by name (fuzzy match)
CREATE OR REPLACE FUNCTION find_profile_by_name(name_text TEXT)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
  trimmed_name TEXT;
BEGIN
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN NULL;
  END IF;
  
  trimmed_name := TRIM(name_text);
  
  -- Try exact match (case-insensitive)
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE LOWER(TRIM(full_name)) = LOWER(trimmed_name)
  LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Try partial match (contains)
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE LOWER(TRIM(full_name)) LIKE '%' || LOWER(trimmed_name) || '%'
  LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Try matching first name
  IF position(' ' IN trimmed_name) > 0 THEN
    SELECT id INTO profile_id
    FROM public.profiles
    WHERE LOWER(TRIM(full_name)) LIKE LOWER(SPLIT_PART(trimmed_name, ' ', 1)) || '%'
    LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Import data from staging table to beast_babe_history
DO $$
DECLARE
  staging_record RECORD;
  parsed_date DATE;
  found_user_id UUID;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
  matched_count INTEGER := 0;
  unmatched_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR staging_record IN 
    SELECT * FROM public.beast_babe_staging
    WHERE TRIM("Person") != ''
  LOOP
    -- Parse date
    parsed_date := parse_beast_babe_date(staging_record."Date");
    
    -- Find user by name
    found_user_id := find_profile_by_name(staging_record."Person");
    
    IF found_user_id IS NULL THEN
      unmatched_names := array_append(unmatched_names, staging_record."Person");
      skipped_count := skipped_count + 1;
      RAISE NOTICE 'Could not find profile for: %', staging_record."Person";
      CONTINUE;
    END IF;
    
    matched_count := matched_count + 1;
    
    -- Insert into beast_babe_history
    -- Check if entry already exists (same user, same date) to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM public.beast_babe_history bb
      WHERE bb.user_id = found_user_id AND bb.date = parsed_date
    ) THEN
      BEGIN
        INSERT INTO public.beast_babe_history (
          date,
          user_id,
          achievement,
          passed_by_user_id
        ) VALUES (
          parsed_date,
          found_user_id,
          NULLIF(TRIM(staging_record."Achievement"), ''),
          NULL  -- Historical data doesn't have who passed it
        );
        
        inserted_count := inserted_count + 1;
      EXCEPTION WHEN OTHERS THEN
        skipped_count := skipped_count + 1;
        RAISE NOTICE 'Error inserting beast babe entry for %: %', staging_record."Person", SQLERRM;
      END;
    ELSE
      skipped_count := skipped_count + 1;
      RAISE NOTICE 'Skipping duplicate entry for % on %', staging_record."Person", parsed_date;
    END IF;
  END LOOP;
  
  -- Report results
  RAISE NOTICE 'Import complete!';
  RAISE NOTICE 'Inserted: %', inserted_count;
  RAISE NOTICE 'Skipped: %', skipped_count;
  RAISE NOTICE 'Matched users: %', matched_count;
  
  IF array_length(unmatched_names, 1) > 0 THEN
    RAISE NOTICE 'Unmatched names:';
    FOR staging_record IN 
      SELECT DISTINCT "Person" FROM public.beast_babe_staging
      WHERE "Person" = ANY(unmatched_names)
    LOOP
      RAISE NOTICE '  - %', staging_record."Person";
    END LOOP;
  END IF;
END;
$$;

-- Step 6: Clean up staging table (optional - uncomment if you want to remove it after import)
-- DROP TABLE IF EXISTS public.beast_babe_staging;

-- Step 7: Verify import
SELECT 
  COUNT(*) as total_entries,
  COUNT(DISTINCT user_id) as unique_beast_babes,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM public.beast_babe_history;

-- Show all imported entries
SELECT 
  bb.date,
  p.full_name,
  bb.achievement
FROM public.beast_babe_history bb
JOIN public.profiles p ON bb.user_id = p.id
ORDER BY bb.date DESC;

