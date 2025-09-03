-- Create groups table for AI music project
CREATE TABLE public.mus240_project_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT 'Fall 2024',
  member_count INTEGER NOT NULL DEFAULT 1,
  max_members INTEGER NOT NULL DEFAULT 4,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group applications table
CREATE TABLE public.mus240_group_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.mus240_project_groups(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  main_skill_set TEXT NOT NULL CHECK (main_skill_set IN ('tech', 'artist', 'speaker', 'researcher', 'writer', 'other')),
  other_skills TEXT,
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  UNIQUE(group_id, applicant_id)
);

-- Create group memberships table
CREATE TABLE public.mus240_group_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.mus240_project_groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, member_id)
);

-- Enable RLS
ALTER TABLE public.mus240_project_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Enrolled students can view groups" ON public.mus240_project_groups
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND semester = mus240_project_groups.semester
    AND enrollment_status = 'enrolled'
  )
);

CREATE POLICY "Enrolled students can create groups" ON public.mus240_project_groups
FOR INSERT WITH CHECK (
  leader_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND semester = semester
    AND enrollment_status = 'enrolled'
  )
);

CREATE POLICY "Group leaders can update their groups" ON public.mus240_project_groups
FOR UPDATE USING (leader_id = auth.uid());

CREATE POLICY "Group leaders can delete empty groups" ON public.mus240_project_groups
FOR DELETE USING (leader_id = auth.uid() AND member_count <= 1);

-- RLS Policies for applications
CREATE POLICY "Students can view applications for their groups or their own" ON public.mus240_group_applications
FOR SELECT USING (
  applicant_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups g 
    WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

CREATE POLICY "Enrolled students can create applications" ON public.mus240_group_applications
FOR INSERT WITH CHECK (
  applicant_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND enrollment_status = 'enrolled'
  )
);

CREATE POLICY "Group leaders can update applications" ON public.mus240_group_applications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups g 
    WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

-- RLS Policies for memberships
CREATE POLICY "Students can view memberships for their groups" ON public.mus240_group_memberships
FOR SELECT USING (
  member_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups g 
    WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

CREATE POLICY "System can manage memberships" ON public.mus240_group_memberships
FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updating group member count and official status
CREATE OR REPLACE FUNCTION update_group_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mus240_project_groups 
  SET 
    member_count = (
      SELECT COUNT(*) FROM public.mus240_group_memberships 
      WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
    ),
    is_official = (
      SELECT COUNT(*) >= 3 FROM public.mus240_group_memberships 
      WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_stats_trigger
  AFTER INSERT OR DELETE ON public.mus240_group_memberships
  FOR EACH ROW EXECUTE FUNCTION update_group_stats();

-- Insert leader as first member when group is created
CREATE OR REPLACE FUNCTION add_leader_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mus240_group_memberships (group_id, member_id, role)
  VALUES (NEW.id, NEW.leader_id, 'leader');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_leader_as_member_trigger
  AFTER INSERT ON public.mus240_project_groups
  FOR EACH ROW EXECUTE FUNCTION add_leader_as_member();