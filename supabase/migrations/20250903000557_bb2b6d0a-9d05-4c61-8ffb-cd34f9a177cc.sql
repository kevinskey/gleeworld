-- Function to refresh all old permissions and migrate to new module assignment system
CREATE OR REPLACE FUNCTION refresh_all_user_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  module_mapping RECORD;
  result_count INTEGER := 0;
  error_count INTEGER := 0;
  result_details jsonb := '[]'::jsonb;
BEGIN
  -- Clear existing module assignments to start fresh
  DELETE FROM username_module_permissions;
  
  -- Loop through all users who have old permissions
  FOR user_record IN 
    SELECT DISTINCT 
      gp.user_id,
      gp.email,
      gp.full_name,
      gp.role,
      gp.is_admin,
      gp.is_super_admin,
      gp.is_exec_board,
      gp.exec_board_role
    FROM gw_profiles gp
    WHERE gp.user_id IS NOT NULL
  LOOP
    BEGIN
      -- Determine what modules this user should have based on their role
      
      -- Executive Board Members get executive modules
      IF user_record.is_exec_board = true OR user_record.is_admin = true OR user_record.is_super_admin = true THEN
        -- Insert executive board modules
        INSERT INTO username_module_permissions (user_id, module_id, can_view, can_manage, source, granted_at, is_active)
        SELECT 
          user_record.user_id,
          m.id,
          true,
          true,
          'bulk_permission_refresh',
          now(),
          true
        FROM gw_modules m
        WHERE m.name IN (
          'executive',
          'user-management', 
          'attendance-management',
          'tour-management',
          'booking-forms',
          'auditions',
          'permissions',
          'wardrobe',
          'wellness',
          'email-management',
          'notifications',
          'pr-coordinator',
          'pr-hub',
          'scheduling-module',
          'calendar-management',
          'service-management',
          'buckets-of-love',
          'glee-writing',
          'fan-engagement',
          'budgets',
          'contracts',
          'approval-system',
          'glee-ledger',
          'receipts-records',
          'dues-collection',
          'monthly-statements',
          'check-requests',
          'merch-store',
          'ai-financial',
          'student-conductor',
          'section-leader',
          'sight-singing-management',
          'sight-reading-generator',
          'member-sight-reading-studio',
          'librarian',
          'radio-management',
          'karaoke',
          'alumnae-portal',
          'first-year-console',
          'ai-tools',
          'hero-manager',
          'settings',
          'press-kits'
        )
        AND m.is_active = true
        ON CONFLICT (user_id, module_id) DO UPDATE SET
          can_view = true,
          can_manage = true,
          source = 'bulk_permission_refresh',
          granted_at = now(),
          is_active = true;
      END IF;
      
      -- All members get standard modules
      IF user_record.role IN ('member', 'alumna', 'fan') OR user_record.is_exec_board = true OR user_record.is_admin = true OR user_record.is_super_admin = true THEN
        INSERT INTO username_module_permissions (user_id, module_id, can_view, can_manage, source, granted_at, is_active)
        SELECT 
          user_record.user_id,
          m.id,
          true,
          false, -- Standard members can view but not manage
          'bulk_permission_refresh',
          now(),
          true
        FROM gw_modules m
        WHERE m.name IN (
          'community-hub',
          'music-library',
          'calendar',
          'attendance',
          'check-in-check-out'
        )
        AND m.is_active = true
        ON CONFLICT (user_id, module_id) DO UPDATE SET
          can_view = true,
          source = 'bulk_permission_refresh',
          granted_at = now(),
          is_active = true;
      END IF;
      
      -- Migrate any existing username_permissions to the module system
      INSERT INTO username_module_permissions (user_id, module_id, can_view, can_manage, source, granted_at, is_active, notes)
      SELECT DISTINCT
        user_record.user_id,
        m.id,
        true,
        true,
        'migrated_from_username_permissions',
        up.granted_at,
        up.is_active,
        COALESCE(up.notes, 'Migrated from old permission system')
      FROM username_permissions up
      JOIN gw_modules m ON m.name = up.module_name
      WHERE up.user_email = user_record.email
      AND up.is_active = true
      AND (up.expires_at IS NULL OR up.expires_at > now())
      ON CONFLICT (user_id, module_id) DO UPDATE SET
        can_view = true,
        can_manage = true,
        source = 'migrated_from_username_permissions',
        granted_at = EXCLUDED.granted_at,
        is_active = true,
        notes = EXCLUDED.notes;
      
      result_count := result_count + 1;
      
      -- Add to result details
      result_details := result_details || jsonb_build_object(
        'user_id', user_record.user_id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'role', user_record.role,
        'is_exec_board', user_record.is_exec_board,
        'status', 'success'
      );
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      
      -- Add error to result details
      result_details := result_details || jsonb_build_object(
        'user_id', user_record.user_id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'status', 'error',
        'error_message', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_users', result_count,
    'errors', error_count,
    'details', result_details,
    'message', format('Successfully refreshed permissions for %s users with %s errors', result_count, error_count)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to refresh user permissions'
  );
END;
$$;