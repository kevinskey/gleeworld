-- Clear ONLY module assignments for users with 'member' role
-- This preserves all other permissions, favorites, ordering, etc.

DELETE FROM public.gw_module_assignments
WHERE assigned_to_user_id IN (
  SELECT user_id 
  FROM public.gw_profiles 
  WHERE role = 'member'
)
AND assignment_type = 'user';

-- Log the reset
DO $$
DECLARE
  deleted_count integer;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleared % module assignments for member role users only', deleted_count;
  RAISE NOTICE 'All other permissions, favorites, and settings remain intact';
END $$;