-- MUS240 group membership access and integrity
-- 1) Enable RLS on relevant tables (safe if already enabled)
ALTER TABLE public.mus240_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_project_groups ENABLE ROW LEVEL SECURITY;

-- 2) Policies for groups (read-only for authenticated users)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mus240_project_groups' AND policyname = 'Authenticated users can view MUS240 groups'
  ) THEN
    CREATE POLICY "Authenticated users can view MUS240 groups"
    ON public.mus240_project_groups
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- 3) Policies for memberships
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mus240_group_memberships' AND policyname = 'Authenticated users can view MUS240 memberships'
  ) THEN
    CREATE POLICY "Authenticated users can view MUS240 memberships"
    ON public.mus240_group_memberships
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mus240_group_memberships' AND policyname = 'Users can join groups (self-insert)'
  ) THEN
    CREATE POLICY "Users can join groups (self-insert)"
    ON public.mus240_group_memberships
    FOR INSERT
    TO authenticated
    WITH CHECK (member_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mus240_group_memberships' AND policyname = 'Users can leave their groups (self-delete)'
  ) THEN
    CREATE POLICY "Users can leave their groups (self-delete)"
    ON public.mus240_group_memberships
    FOR DELETE
    TO authenticated
    USING (member_id = auth.uid());
  END IF;
END $$;

-- 4) Trigger to enforce capacity before insert
CREATE OR REPLACE FUNCTION public.enforce_mus240_group_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_count integer;
  v_max integer;
BEGIN
  SELECT member_count, COALESCE(max_members, 4)
  INTO v_member_count, v_max
  FROM public.mus240_project_groups
  WHERE id = NEW.group_id
  FOR UPDATE;

  IF v_member_count IS NULL THEN
    v_member_count := 0;
  END IF;

  IF v_member_count >= v_max THEN
    RAISE EXCEPTION 'Group is full (max %)', v_max USING HINT = 'Please choose another group.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'mus240_enforce_capacity_before_insert'
  ) THEN
    CREATE TRIGGER mus240_enforce_capacity_before_insert
    BEFORE INSERT ON public.mus240_group_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_mus240_group_capacity();
  END IF;
END $$;

-- 5) Recalculate member_count after changes
CREATE OR REPLACE FUNCTION public.recalc_mus240_group_member_count(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.mus240_project_groups g
  SET member_count = (
    SELECT COUNT(*) FROM public.mus240_group_memberships m
    WHERE m.group_id = p_group_id
  ), updated_at = now()
  WHERE g.id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mus240_after_membership_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_mus240_group_member_count(NEW.group_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_mus240_group_member_count(OLD.group_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalc for both old and new if group_id changed
    IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
      PERFORM public.recalc_mus240_group_member_count(OLD.group_id);
      PERFORM public.recalc_mus240_group_member_count(NEW.group_id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'mus240_membership_after_change'
  ) THEN
    CREATE TRIGGER mus240_membership_after_change
    AFTER INSERT OR UPDATE OR DELETE ON public.mus240_group_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.mus240_after_membership_change();
  END IF;
END $$;

-- 6) RPC: Leave group
CREATE OR REPLACE FUNCTION public.leave_mus240_group(p_group_id uuid, p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN := false;
  is_leader BOOLEAN := false;
BEGIN
  -- Check admin via profile flags
  SELECT COALESCE(is_admin, false) OR COALESCE(is_super_admin, false)
  INTO is_admin
  FROM public.gw_profiles
  WHERE user_id = auth.uid();

  -- Check group leader
  SELECT (leader_id = auth.uid())
  INTO is_leader
  FROM public.mus240_project_groups
  WHERE id = p_group_id;

  IF auth.uid() <> p_member_id AND NOT (is_admin OR is_leader) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to remove this member');
  END IF;

  DELETE FROM public.mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_member_id;

  -- Recalculate member count
  PERFORM public.recalc_mus240_group_member_count(p_group_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7) RPC: Update member role (leader/admin only)
CREATE OR REPLACE FUNCTION public.update_mus240_member_role(
  p_group_id uuid,
  p_member_id uuid,
  p_new_role text,
  p_requester_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN := false;
  is_leader BOOLEAN := false;
BEGIN
  -- Ensure caller matches requester
  IF auth.uid() IS NULL OR auth.uid() <> p_requester_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid requester');
  END IF;

  -- Check admin via profile flags
  SELECT COALESCE(is_admin, false) OR COALESCE(is_super_admin, false)
  INTO is_admin
  FROM public.gw_profiles
  WHERE user_id = auth.uid();

  -- Check group leader
  SELECT (leader_id = auth.uid())
  INTO is_leader
  FROM public.mus240_project_groups
  WHERE id = p_group_id;

  IF NOT (is_admin OR is_leader) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update member roles');
  END IF;

  UPDATE public.mus240_group_memberships
  SET role = p_new_role
  WHERE group_id = p_group_id AND member_id = p_member_id;

  RETURN jsonb_build_object('success', true);
END;
$$;