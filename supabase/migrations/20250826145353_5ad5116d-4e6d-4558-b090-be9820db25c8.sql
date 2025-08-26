-- Update profile to sync with executive board membership
UPDATE gw_profiles 
SET 
  is_exec_board = true,
  exec_board_role = 'tour_manager'
WHERE user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';

-- Let's also create a trigger to keep these in sync automatically
CREATE OR REPLACE FUNCTION sync_exec_board_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- User added to or updated in executive board
    IF NEW.is_active = true THEN
      UPDATE gw_profiles 
      SET 
        is_exec_board = true,
        exec_board_role = NEW.position,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      -- User deactivated in executive board
      UPDATE gw_profiles 
      SET 
        is_exec_board = false,
        exec_board_role = null,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- User removed from executive board
    UPDATE gw_profiles 
    SET 
      is_exec_board = false,
      exec_board_role = null,
      updated_at = now()
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on executive board members table
DROP TRIGGER IF EXISTS sync_exec_board_profile_trigger ON gw_executive_board_members;
CREATE TRIGGER sync_exec_board_profile_trigger
  AFTER INSERT OR UPDATE OR DELETE ON gw_executive_board_members
  FOR EACH ROW EXECUTE FUNCTION sync_exec_board_profile();