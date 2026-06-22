-- Phase 22: per-course concert events + ticket requests.
-- One row per concert this class is performing; students request tickets
-- via a count (number of guests). Instructor sees the rollup.

CREATE TABLE IF NOT EXISTS public.gw_course_concert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  event_date timestamptz,
  venue text,
  description text,
  max_tickets_per_request int NOT NULL DEFAULT 4,
  is_open boolean NOT NULL DEFAULT true,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_course_concert_events_course_idx
  ON public.gw_course_concert_events(course_id, position);

CREATE TABLE IF NOT EXISTS public.gw_course_concert_ticket_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.gw_course_concert_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticket_count int NOT NULL DEFAULT 1 CHECK (ticket_count >= 1),
  guest_names text,
  notes text,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.gw_course_concert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_concert_ticket_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_concert_events;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_concert_events
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_concert_ticket_requests;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_concert_ticket_requests
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Events: instructor manages, enrolled students read
DROP POLICY IF EXISTS "Instructor manages concerts" ON public.gw_course_concert_events;
CREATE POLICY "Instructor manages concerts" ON public.gw_course_concert_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_concert_events.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_concert_events.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Enrolled students read concerts" ON public.gw_course_concert_events;
CREATE POLICY "Enrolled students read concerts" ON public.gw_course_concert_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_concert_events.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );

-- Ticket requests: students manage their own; instructor of course reads all
DROP POLICY IF EXISTS "Students manage own ticket requests" ON public.gw_course_concert_ticket_requests;
CREATE POLICY "Students manage own ticket requests" ON public.gw_course_concert_ticket_requests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Instructor reads ticket requests" ON public.gw_course_concert_ticket_requests;
CREATE POLICY "Instructor reads ticket requests" ON public.gw_course_concert_ticket_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_concert_events ev
      JOIN public.gw_courses c ON c.id = ev.course_id
      WHERE ev.id = gw_course_concert_ticket_requests.event_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );
