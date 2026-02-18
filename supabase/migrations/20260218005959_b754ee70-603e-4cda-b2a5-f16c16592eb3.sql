
-- Table for student-submitted rehearsal conflict/excuse requests
CREATE TABLE public.gw_rehearsal_excuse_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL DEFAULT 'a0000000-0000-0000-0000-000000000070',
  conflict_course_name TEXT NOT NULL,
  conflict_course_code TEXT,
  conflict_days TEXT[] NOT NULL,
  conflict_start_time TIME NOT NULL,
  conflict_end_time TIME NOT NULL,
  excuse_type TEXT NOT NULL DEFAULT 'partial' CHECK (excuse_type IN ('full', 'partial')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_rehearsal_excuse_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own requests
CREATE POLICY "Students can view own excuse requests"
  ON public.gw_rehearsal_excuse_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Students can insert their own requests
CREATE POLICY "Students can submit excuse requests"
  ON public.gw_rehearsal_excuse_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admins can view all requests
CREATE POLICY "Super admins can view all excuse requests"
  ON public.gw_rehearsal_excuse_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admins can update (approve/deny) requests
CREATE POLICY "Super admins can update excuse requests"
  ON public.gw_rehearsal_excuse_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_rehearsal_excuse_requests_updated_at
  BEFORE UPDATE ON public.gw_rehearsal_excuse_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
