-- Create academy group system that integrates with existing MUS240 groups

-- Main groups table for all academy courses
CREATE TABLE IF NOT EXISTS public.gw_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_members INTEGER DEFAULT 5,
  leader_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_official BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  semester TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Legacy mapping for MUS240 integration
  legacy_id UUID,
  legacy_source TEXT,
  
  CONSTRAINT unique_group_name_per_course UNIQUE(course_id, name, semester)
);

-- Group members table
CREATE TABLE IF NOT EXISTS public.gw_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.gw_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_group_membership UNIQUE(group_id, user_id)
);

-- Group applications table
CREATE TABLE IF NOT EXISTS public.gw_group_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.gw_groups(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  application_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_application UNIQUE(group_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.gw_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_group_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_groups (simplified to check enrollment exists)
CREATE POLICY "Enrolled students can view groups in their courses"
  ON public.gw_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_enrollments
      WHERE student_id = auth.uid()
      AND course_id = gw_groups.course_id
    )
  );

CREATE POLICY "Enrolled students can create groups"
  ON public.gw_groups FOR INSERT
  WITH CHECK (
    leader_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.gw_enrollments
      WHERE student_id = auth.uid()
      AND course_id = gw_groups.course_id
    )
  );

CREATE POLICY "Group leaders can update their groups"
  ON public.gw_groups FOR UPDATE
  USING (leader_id = auth.uid());

CREATE POLICY "Group leaders can delete their groups"
  ON public.gw_groups FOR DELETE
  USING (leader_id = auth.uid());

-- RLS Policies for gw_group_members
CREATE POLICY "Users can view memberships in their groups"
  ON public.gw_group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_groups
      WHERE id = gw_group_members.group_id
      AND leader_id = auth.uid()
    )
  );

CREATE POLICY "System can manage memberships"
  ON public.gw_group_members FOR ALL
  USING (true) WITH CHECK (true);

-- RLS Policies for gw_group_applications
CREATE POLICY "Users can view applications for their groups or their own"
  ON public.gw_group_applications FOR SELECT
  USING (
    applicant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_groups
      WHERE id = gw_group_applications.group_id
      AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can create applications"
  ON public.gw_group_applications FOR INSERT
  WITH CHECK (
    applicant_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.gw_groups g
      JOIN public.gw_enrollments e ON e.course_id = g.course_id
      WHERE g.id = gw_group_applications.group_id
      AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can update applications"
  ON public.gw_group_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_groups
      WHERE id = gw_group_applications.group_id
      AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Applicants can delete their pending applications"
  ON public.gw_group_applications FOR DELETE
  USING (applicant_id = auth.uid() AND status = 'pending');

-- Trigger to update group stats when members change
CREATE OR REPLACE FUNCTION update_gw_group_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.gw_groups
  SET
    member_count = (
      SELECT COUNT(*) FROM public.gw_group_members
      WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
    ),
    is_official = (
      SELECT COUNT(*) >= 3 FROM public.gw_group_members
      WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_gw_group_stats_trigger
  AFTER INSERT OR DELETE ON public.gw_group_members
  FOR EACH ROW EXECUTE FUNCTION update_gw_group_stats();

-- Trigger to auto-add group leader as member
CREATE OR REPLACE FUNCTION add_gw_group_leader_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gw_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.leader_id, 'leader');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_gw_group_leader_trigger
  AFTER INSERT ON public.gw_groups
  FOR EACH ROW EXECUTE FUNCTION add_gw_group_leader_as_member();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_groups_course_id ON public.gw_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_gw_groups_leader_id ON public.gw_groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_gw_groups_legacy ON public.gw_groups(legacy_id, legacy_source);
CREATE INDEX IF NOT EXISTS idx_gw_group_members_group_id ON public.gw_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_gw_group_members_user_id ON public.gw_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_group_applications_group_id ON public.gw_group_applications(group_id);
CREATE INDEX IF NOT EXISTS idx_gw_group_applications_applicant ON public.gw_group_applications(applicant_id);