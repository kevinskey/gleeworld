-- Remove the trigger that automatically adds leader as member
DROP TRIGGER IF EXISTS add_leader_as_member_trigger ON public.mus240_project_groups;

-- Also drop the function if it exists
DROP FUNCTION IF EXISTS public.add_leader_as_member();