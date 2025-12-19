-- Create messenger groups table for communication management
CREATE TABLE IF NOT EXISTS public.messenger_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create messenger group members table
CREATE TABLE IF NOT EXISTS public.messenger_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_messenger_group_member UNIQUE (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.messenger_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for messenger_groups
CREATE POLICY "Admins can manage messenger groups"
ON public.messenger_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
);

CREATE POLICY "Authenticated users can view active messenger groups"
ON public.messenger_groups
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create policies for messenger_group_members
CREATE POLICY "Admins can manage messenger group members"
ON public.messenger_group_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
);

CREATE POLICY "Users can view their own group memberships"
ON public.messenger_group_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_messenger_groups_active ON public.messenger_groups(is_active);
CREATE INDEX idx_messenger_group_members_group_id ON public.messenger_group_members(group_id);
CREATE INDEX idx_messenger_group_members_user_id ON public.messenger_group_members(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_messenger_groups_updated_at
  BEFORE UPDATE ON public.messenger_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();