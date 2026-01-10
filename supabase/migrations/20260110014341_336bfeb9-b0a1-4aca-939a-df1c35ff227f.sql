-- Allow executive board editors to manage handbook appendices (e.g., Appendix D)

-- 1) Helper role check (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.user_has_executive_board_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_roles ar
    WHERE ar.user_id = user_id_param
      AND ar.role = 'executive_board'
      AND ar.is_active = TRUE
  )
  OR EXISTS (
    SELECT 1
    FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = user_id_param
      AND ebm.is_active = TRUE
  );
$$;

-- 2) Policies for handbook_appendices (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'handbook_appendices'
      AND policyname = 'Executive board can read all handbook appendices'
  ) THEN
    CREATE POLICY "Executive board can read all handbook appendices"
    ON public.handbook_appendices
    FOR SELECT
    TO authenticated
    USING (public.user_has_executive_board_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'handbook_appendices'
      AND policyname = 'Executive board can insert handbook appendices'
  ) THEN
    CREATE POLICY "Executive board can insert handbook appendices"
    ON public.handbook_appendices
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_has_executive_board_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'handbook_appendices'
      AND policyname = 'Executive board can update handbook appendices'
  ) THEN
    CREATE POLICY "Executive board can update handbook appendices"
    ON public.handbook_appendices
    FOR UPDATE
    TO authenticated
    USING (public.user_has_executive_board_role(auth.uid()));
  END IF;
END
$$;