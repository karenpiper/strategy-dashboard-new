-- Function to update hierarchy levels based on manager relationships
-- This calculates depth in the org chart tree (0 = top level, 1 = reports to top, etc.)

CREATE OR REPLACE FUNCTION update_hierarchy_levels()
RETURNS void AS $$
DECLARE
  max_depth INTEGER := 20; -- Safety limit
  current_level INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  -- Reset all levels
  UPDATE profiles SET hierarchy_level = NULL;
  
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

-- Run the function
SELECT update_hierarchy_levels();

-- Optional: Create a trigger to auto-update levels when manager_id changes
CREATE OR REPLACE FUNCTION trigger_update_hierarchy_levels()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if manager_id actually changed
  IF (TG_OP = 'UPDATE' AND OLD.manager_id IS DISTINCT FROM NEW.manager_id) OR TG_OP = 'INSERT' THEN
    PERFORM update_hierarchy_levels();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS profiles_update_hierarchy_levels ON profiles;
CREATE TRIGGER profiles_update_hierarchy_levels
  AFTER INSERT OR UPDATE OF manager_id ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_update_hierarchy_levels();



