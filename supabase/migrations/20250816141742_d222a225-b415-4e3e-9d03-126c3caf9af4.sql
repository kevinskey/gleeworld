-- Create RLS policies for all tables to complete the security setup

-- Users table policies
CREATE POLICY "users_admin_full_access" ON public.users
FOR ALL USING (
  public.get_user_role() IN ('staff', 'director', 'admin')
);

CREATE POLICY "users_self_access" ON public.users
FOR SELECT USING (auth.uid() = id);

-- Cohorts table policies
CREATE POLICY "cohorts_staff_full_access" ON public.cohorts
FOR ALL USING (
  public.get_user_role() IN ('staff', 'director', 'admin')
);

CREATE POLICY "cohorts_coordinator_access" ON public.cohorts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coordinator_cohorts cc
    WHERE cc.cohort_id = cohorts.id AND cc.user_id = auth.uid()
  )
);

CREATE POLICY "cohorts_member_read_access" ON public.cohorts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cohort_members cm
    WHERE cm.cohort_id = cohorts.id AND cm.user_id = auth.uid()
  )
);

-- Cohort members table policies
CREATE POLICY "cohort_members_staff_full_access" ON public.cohort_members
FOR ALL USING (
  public.get_user_role() IN ('staff', 'director', 'admin')
);

CREATE POLICY "cohort_members_coordinator_access" ON public.cohort_members
FOR SELECT USING (
  public.is_coordinator_for_cohort(cohort_id)
);

CREATE POLICY "cohort_members_self_access" ON public.cohort_members
FOR SELECT USING (auth.uid() = user_id);

-- Attendance table policies
CREATE POLICY "students_read_own_attendance" ON public.attendance
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "coordinators_read_cohort_attendance" ON public.attendance
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cohort_members cm
    JOIN public.coordinator_cohorts cc ON cc.cohort_id = cm.cohort_id
    WHERE cm.user_id = attendance.user_id AND cc.user_id = auth.uid()
  )
);

CREATE POLICY "staff_read_all_attendance" ON public.attendance
FOR SELECT USING (
  public.get_user_role() IN ('staff', 'director', 'admin')
);

CREATE POLICY "staff_manage_all_attendance" ON public.attendance
FOR ALL USING (
  public.get_user_role() IN ('staff', 'director', 'admin')
);

-- Events table policies (add to existing table)
CREATE POLICY "events_cohort_staff_access" ON public.events
FOR SELECT USING (
  public.get_user_role() IN ('staff', 'director', 'admin') OR
  EXISTS (
    SELECT 1 FROM public.coordinator_cohorts cc
    WHERE cc.cohort_id = events.cohort_id AND cc.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.cohort_members cm
    WHERE cm.cohort_id = events.cohort_id AND cm.user_id = auth.uid()
  )
);

-- Coordinator cohorts table policies
CREATE POLICY "coordinator_cohorts_staff_manage" ON public.coordinator_cohorts
FOR ALL USING (
  public.get_user_role() IN ('staff', 'director', 'admin')
);

CREATE POLICY "coordinator_cohorts_self_view" ON public.coordinator_cohorts
FOR SELECT USING (auth.uid() = user_id);