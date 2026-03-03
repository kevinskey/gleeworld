
-- Table for check-in sessions created by tour managers
CREATE TABLE public.gw_tour_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.gw_tours(id) ON DELETE CASCADE,
  city_id uuid REFERENCES public.gw_tour_cities(id) ON DELETE SET NULL,
  title text NOT NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_tour_checkins ENABLE ROW LEVEL SECURITY;

-- Managers (admin/super_admin) can do everything
CREATE POLICY "Admins can manage checkins"
  ON public.gw_tour_checkins FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles_multi WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles_multi WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- Authenticated members can view checkins for tours they're on
CREATE POLICY "Members can view checkins"
  ON public.gw_tour_checkins FOR SELECT
  TO authenticated
  USING (true);

-- Table for member responses
CREATE TABLE public.gw_tour_checkin_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid NOT NULL REFERENCES public.gw_tour_checkins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(checkin_id, user_id)
);

ALTER TABLE public.gw_tour_checkin_responses ENABLE ROW LEVEL SECURITY;

-- Members can insert their own response
CREATE POLICY "Members can check in"
  ON public.gw_tour_checkin_responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Members can view their own responses
CREATE POLICY "Members can view own responses"
  ON public.gw_tour_checkin_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
  ON public.gw_tour_checkin_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles_multi WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
  );
