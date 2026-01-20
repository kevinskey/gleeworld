
-- =============================================================================
-- UNIFIED CALENDAR + QR ATTENDANCE SYSTEM
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE gw_attendance_sessions TABLE
-- Manages attendance sessions for courses/events with QR code support
-- -----------------------------------------------------------------------------
CREATE TABLE public.gw_attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  opens_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closes_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 hours'),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled')),
  mode TEXT NOT NULL DEFAULT 'qr' CHECK (mode IN ('qr', 'manual', 'hybrid')),
  roster_scope TEXT NOT NULL DEFAULT 'enrolled_students' CHECK (roster_scope IN ('enrolled_students', 'tour_roster', 'custom_group')),
  custom_group_ids UUID[] DEFAULT '{}',
  qr_token_hash TEXT,
  qr_expires_at TIMESTAMP WITH TIME ZONE,
  allow_late_checkin BOOLEAN NOT NULL DEFAULT true,
  late_threshold_minutes INTEGER DEFAULT 15,
  requires_grading BOOLEAN NOT NULL DEFAULT false,
  grade_weight NUMERIC(5,2) DEFAULT 1.0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for gw_attendance_sessions
CREATE POLICY "Instructors can manage attendance sessions for their courses"
ON public.gw_attendance_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_course_enrollments e
    WHERE e.course_id = gw_attendance_sessions.course_id
    AND e.user_id = auth.uid()
    AND e.role IN ('instructor', 'ta')
    AND e.enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role IN ('superadmin', 'admin')
    AND ar.is_active = true
  )
);

CREATE POLICY "Enrolled students can view attendance sessions for their courses"
ON public.gw_attendance_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_course_enrollments e
    WHERE e.course_id = gw_attendance_sessions.course_id
    AND e.user_id = auth.uid()
    AND e.enrollment_status = 'enrolled'
  )
);

-- Index for performance
CREATE INDEX idx_attendance_sessions_course ON public.gw_attendance_sessions(course_id);
CREATE INDEX idx_attendance_sessions_event ON public.gw_attendance_sessions(event_id);
CREATE INDEX idx_attendance_sessions_status ON public.gw_attendance_sessions(status);
CREATE INDEX idx_attendance_sessions_opens ON public.gw_attendance_sessions(opens_at);

-- -----------------------------------------------------------------------------
-- 2. CREATE gw_attendance_records TABLE
-- Individual attendance records for students
-- -----------------------------------------------------------------------------
CREATE TABLE public.gw_attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_session_id UUID NOT NULL REFERENCES public.gw_attendance_sessions(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'late', 'absent', 'excused')),
  marked_by UUID REFERENCES auth.users(id),
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_in_method TEXT DEFAULT 'manual' CHECK (check_in_method IN ('qr', 'manual', 'pin', 'auto')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attendance_session_id, student_profile_id)
);

-- Enable RLS
ALTER TABLE public.gw_attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for gw_attendance_records
CREATE POLICY "Instructors can manage attendance records for their sessions"
ON public.gw_attendance_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    JOIN gw_course_enrollments e ON e.course_id = s.course_id
    WHERE s.id = gw_attendance_records.attendance_session_id
    AND e.user_id = auth.uid()
    AND e.role IN ('instructor', 'ta')
    AND e.enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role IN ('superadmin', 'admin')
    AND ar.is_active = true
  )
);

CREATE POLICY "Students can view their own attendance records"
ON public.gw_attendance_records
FOR SELECT
USING (student_profile_id = auth.uid());

CREATE POLICY "Students can insert their own attendance via QR/PIN"
ON public.gw_attendance_records
FOR INSERT
WITH CHECK (
  student_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    WHERE s.id = attendance_session_id
    AND s.status = 'open'
    AND now() BETWEEN s.opens_at AND s.closes_at
  )
);

-- Indexes
CREATE INDEX idx_attendance_records_session ON public.gw_attendance_records(attendance_session_id);
CREATE INDEX idx_attendance_records_student ON public.gw_attendance_records(student_profile_id);
CREATE INDEX idx_attendance_records_status ON public.gw_attendance_records(status);

-- -----------------------------------------------------------------------------
-- 3. CREATE gw_calendar_subscriptions TABLE
-- For master calendar overlay subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE public.gw_calendar_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES public.gw_calendars(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  color_override TEXT,
  notification_enabled BOOLEAN NOT NULL DEFAULT false,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Enable RLS
ALTER TABLE public.gw_calendar_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar subscriptions"
ON public.gw_calendar_subscriptions
FOR ALL
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_calendar_subscriptions_user ON public.gw_calendar_subscriptions(user_id);
CREATE INDEX idx_calendar_subscriptions_calendar ON public.gw_calendar_subscriptions(calendar_id);

-- -----------------------------------------------------------------------------
-- 4. EXTEND events TABLE
-- Add attendance/grading metadata fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS requires_grading BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linked_attendance_session_id UUID REFERENCES public.gw_attendance_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_assignment_id UUID;

-- Index for linked attendance
CREATE INDEX IF NOT EXISTS idx_events_linked_attendance ON public.events(linked_attendance_session_id);

-- -----------------------------------------------------------------------------
-- 5. EXTEND gw_course_calendar TABLE
-- Add course calendar configuration fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.gw_course_calendar
ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES public.gw_calendars(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_enabled_in_course BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS post_permission TEXT NOT NULL DEFAULT 'instructor_only' CHECK (post_permission IN ('instructor_only', 'instructor_ta', 'instructor_ta_students')),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Index for course calendar lookups
CREATE INDEX IF NOT EXISTS idx_course_calendar_course ON public.gw_course_calendar(course_id);
CREATE INDEX IF NOT EXISTS idx_course_calendar_enabled ON public.gw_course_calendar(is_enabled_in_course);

-- -----------------------------------------------------------------------------
-- 6. CREATE TRIGGER for updated_at timestamps
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gw_attendance_sessions_updated_at
BEFORE UPDATE ON public.gw_attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_attendance_records_updated_at
BEFORE UPDATE ON public.gw_attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_calendar_subscriptions_updated_at
BEFORE UPDATE ON public.gw_calendar_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 7. CREATE RPC for QR token generation (rotating tokens)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_attendance_qr_token(
  p_session_id UUID,
  p_expires_in_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(qr_token TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMP WITH TIME ZONE;
  v_hash TEXT;
BEGIN
  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_expires := now() + (p_expires_in_minutes || ' minutes')::interval;
  v_hash := encode(digest(v_token, 'sha256'), 'hex');
  
  -- Update session with new token hash
  UPDATE gw_attendance_sessions
  SET qr_token_hash = v_hash,
      qr_expires_at = v_expires,
      updated_at = now()
  WHERE id = p_session_id
  AND EXISTS (
    SELECT 1 FROM gw_course_enrollments e
    WHERE e.course_id = gw_attendance_sessions.course_id
    AND e.user_id = auth.uid()
    AND e.role IN ('instructor', 'ta')
  );
  
  RETURN QUERY SELECT v_token, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- 8. CREATE RPC for processing QR attendance check-in
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_attendance_qr_checkin(
  p_qr_token TEXT,
  p_student_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(success BOOLEAN, message TEXT, status TEXT) AS $$
DECLARE
  v_session_id UUID;
  v_course_id UUID;
  v_token_hash TEXT;
  v_status TEXT;
  v_is_late BOOLEAN;
BEGIN
  -- Hash the incoming token
  v_token_hash := encode(digest(p_qr_token, 'sha256'), 'hex');
  
  -- Find matching session
  SELECT s.id, s.course_id,
         CASE WHEN now() > s.opens_at + (s.late_threshold_minutes || ' minutes')::interval THEN true ELSE false END
  INTO v_session_id, v_course_id, v_is_late
  FROM gw_attendance_sessions s
  WHERE s.qr_token_hash = v_token_hash
  AND s.qr_expires_at > now()
  AND s.status = 'open'
  AND now() BETWEEN s.opens_at AND s.closes_at;
  
  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired QR code'::TEXT, 'error'::TEXT;
    RETURN;
  END IF;
  
  -- Verify student is enrolled (roster gating)
  IF NOT EXISTS (
    SELECT 1 FROM gw_course_enrollments e
    WHERE e.course_id = v_course_id
    AND e.user_id = p_student_id
    AND e.enrollment_status = 'enrolled'
  ) THEN
    RETURN QUERY SELECT false, 'You are not enrolled in this course'::TEXT, 'error'::TEXT;
    RETURN;
  END IF;
  
  -- Determine status
  v_status := CASE WHEN v_is_late THEN 'late' ELSE 'present' END;
  
  -- Insert or update attendance record
  INSERT INTO gw_attendance_records (
    attendance_session_id,
    student_profile_id,
    status,
    marked_by,
    check_in_method
  ) VALUES (
    v_session_id,
    p_student_id,
    v_status,
    p_student_id,
    'qr'
  )
  ON CONFLICT (attendance_session_id, student_profile_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    marked_at = now(),
    check_in_method = 'qr',
    updated_at = now();
  
  RETURN QUERY SELECT true, 'Checked in successfully'::TEXT, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_attendance_qr_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_attendance_qr_checkin TO authenticated;
