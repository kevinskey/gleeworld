-- Allow leader_id to be nullable in mus240_project_groups table
ALTER TABLE public.mus240_project_groups 
ALTER COLUMN leader_id DROP NOT NULL;

-- Update the constraint to allow groups without leaders initially
COMMENT ON COLUMN public.mus240_project_groups.leader_id IS 'Group leader ID - can be null for groups without members';