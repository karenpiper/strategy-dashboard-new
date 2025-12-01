-- Fix the update_hierarchy_levels function to use WHERE clause
-- This prevents the "UPDATE requires a WHERE clause" error from Supabase/PostgREST

CREATE OR REPLACE FUNCTION update_hierarchy_levels()
RETURNS void AS $$
DECLARE
  max_depth INTEGER := 20; -- Safety limit
  current_level INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  -- Reset all levels (use WHERE TRUE to satisfy PostgREST safety check)
  UPDATE profiles SET hierarchy_level = NULL WHERE TRUE;
  
  -- Set level 0 (top level - no manager)
  UPDATE profiles SET hierarchy_level = 0 WHERE manager_id IS NULL;
  
  -- Recursively set levels based on manager's level
  WHILE current_level < max_depth LOOP
    UPDATE profiles p
    SET hierarchy_level = current_level + 1
    WHERE p.manager_id IS NOT NULL
      AND p.hierarchy_level IS NULL
      AND EXISTS (
        SELECT 1 FROM profiles m
        WHERE m.id = p.manager_id
        AND m.hierarchy_level = current_level
      );
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Exit if no more rows were updated
    EXIT WHEN rows_updated = 0;
    
    current_level := current_level + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated hierarchy levels. Max depth: %', current_level;
END;
$$ LANGUAGE plpgsql;


