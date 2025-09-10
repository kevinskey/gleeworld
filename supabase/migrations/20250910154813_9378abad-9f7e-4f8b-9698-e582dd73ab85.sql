-- Create tables for group collaboration features

-- Group notes table
CREATE TABLE public.mus240_group_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group links table
CREATE TABLE public.mus240_group_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group sandboxes table
CREATE TABLE public.mus240_group_sandboxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sandbox_url TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mus240_group_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_sandboxes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group notes
CREATE POLICY "Group members can view group notes" 
ON public.mus240_group_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_notes.group_id 
    AND member_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Group members can create group notes" 
ON public.mus240_group_notes 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_notes.group_id 
    AND member_id = auth.uid()
  )
);

CREATE POLICY "Note creators and group leaders can update notes" 
ON public.mus240_group_notes 
FOR UPDATE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_notes.group_id 
    AND member_id = auth.uid() 
    AND role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Note creators and group leaders can delete notes" 
ON public.mus240_group_notes 
FOR DELETE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_notes.group_id 
    AND member_id = auth.uid() 
    AND role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for group links
CREATE POLICY "Group members can view group links" 
ON public.mus240_group_links 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_links.group_id 
    AND member_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Group members can create group links" 
ON public.mus240_group_links 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_links.group_id 
    AND member_id = auth.uid()
  )
);

CREATE POLICY "Link creators and group leaders can update links" 
ON public.mus240_group_links 
FOR UPDATE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_links.group_id 
    AND member_id = auth.uid() 
    AND role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Link creators and group leaders can delete links" 
ON public.mus240_group_links 
FOR DELETE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_links.group_id 
    AND member_id = auth.uid() 
    AND role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for group sandboxes
CREATE POLICY "Group members can view group sandboxes" 
ON public.mus240_group_sandboxes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_sandboxes.group_id 
    AND member_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Group members can create group sandboxes" 
ON public.mus240_group_sandboxes 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_sandboxes.group_id 
    AND member_id = auth.uid()
  )
);

CREATE POLICY "Sandbox creators and group leaders can update sandboxes" 
ON public.mus240_group_sandboxes 
FOR UPDATE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_sandboxes.group_id 
    AND member_id = auth.uid() 
    AND role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Sandbox creators and group leaders can delete sandboxes" 
ON public.mus240_group_sandboxes 
FOR DELETE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.mus240_group_memberships 
    WHERE group_id = mus240_group_sandboxes.group_id 
    AND member_id = auth.uid() 
    AND role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_mus240_group_notes_group_id ON public.mus240_group_notes(group_id);
CREATE INDEX idx_mus240_group_notes_created_by ON public.mus240_group_notes(created_by);
CREATE INDEX idx_mus240_group_links_group_id ON public.mus240_group_links(group_id);
CREATE INDEX idx_mus240_group_links_created_by ON public.mus240_group_links(created_by);
CREATE INDEX idx_mus240_group_sandboxes_group_id ON public.mus240_group_sandboxes(group_id);
CREATE INDEX idx_mus240_group_sandboxes_created_by ON public.mus240_group_sandboxes(created_by);

-- Create triggers for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_mus240_group_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mus240_group_notes_updated_at
  BEFORE UPDATE ON public.mus240_group_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_mus240_group_content_updated_at();

CREATE TRIGGER update_mus240_group_links_updated_at
  BEFORE UPDATE ON public.mus240_group_links
  FOR EACH ROW
  EXECUTE FUNCTION update_mus240_group_content_updated_at();

CREATE TRIGGER update_mus240_group_sandboxes_updated_at
  BEFORE UPDATE ON public.mus240_group_sandboxes
  FOR EACH ROW
  EXECUTE FUNCTION update_mus240_group_content_updated_at();