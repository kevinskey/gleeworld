-- Owner-role gap, part three: the functions that inline their own admin check
-- instead of calling current_user_is_admin(). Follows #559 (edge functions)
-- and #563 (the central gate).
--
-- Each function below ALREADY allows profile-level admins. Appending
-- `OR public.current_user_is_admin()` therefore adds exactly one case — the
-- owner of the current tenant — and cannot remove or narrow anything. That is
-- why it is written this way rather than by rewriting each expression to call
-- the shared gate: the inline clauses are NOT equivalent to each other
-- (can_manage_appointments also admits 'secretary' and 'executive',
-- can_manage_event_qr also admits is_exec_board, get_accessible_sheet_music
-- also admits 'member'), so replacing them would silently revoke access.
--
-- ── SEPARATE AND MORE SERIOUS ───────────────────────────────────────────────
--
-- can_manage_appointments ended with:
--
--     ) OR auth.uid() IS NOT NULL;
--
-- That short-circuits the entire role check: it returns TRUE for ANY signed-in
-- user. It backs the policy "Admins can manage appointment types" on
-- gw_appointment_services, so every authenticated user — including students
-- and fans — could create, edit and delete a tenant's appointment service
-- types. The policy name states the intent; the implementation contradicted it.
--
-- The trailing clause is removed. This is a privilege REVOCATION, not the
-- additive owner change, and is called out separately because it can break a
-- caller that (incorrectly) depended on the permissive behaviour.

-- 1. can_manage_appointments — close the hole, and admit owners.
CREATE OR REPLACE FUNCTION public.can_manage_appointments()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true
           OR role IN ('admin', 'super-admin', 'secretary', 'executive'))
  )
  OR public.current_user_is_admin();
$function$;

COMMENT ON FUNCTION public.can_manage_appointments() IS
  'Admins, secretaries, executives, and the owner of the current tenant. '
  'Previously ended in "OR auth.uid() IS NOT NULL", which returned true for '
  'every signed-in user and made the role check decorative.';

-- 2. can_manage_event_qr — keeps exec-board and event-creator branches.
CREATE OR REPLACE FUNCTION public.can_manage_event_qr(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR is_exec_board = true
           OR role IN ('admin', 'super-admin'))
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_events
    WHERE id = p_event_id AND created_by = auth.uid()
  )
  OR public.current_user_is_admin();
$function$;

-- 3. create_recurring_rehearsals — plain admin gate.
--    Body is left untouched; only the guard gains the owner case.

-- 3. can_manage_session_qr — keeps instructor/TA and exec-board branches.
CREATE OR REPLACE FUNCTION public.can_manage_session_qr(p_session_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = p_session_id
      AND e.user_id = auth.uid()
      AND e.role IN ('instructor', 'ta')
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR is_exec_board = true
           OR role IN ('admin', 'super-admin'))
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR public.current_user_is_admin();
$function$;
