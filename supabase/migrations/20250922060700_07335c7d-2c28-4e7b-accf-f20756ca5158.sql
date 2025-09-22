-- Create tables for MUS 240 group sandboxes if they don't exist
CREATE TABLE IF NOT EXISTS public.mus240_group_sandboxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sandbox_url TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for group notes if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mus240_group_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for group links if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mus240_group_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mus240_group_sandboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_links ENABLE ROW LEVEL SECURITY;

-- Create policies for sandboxes
CREATE POLICY "Users can view sandboxes for their groups" 
ON public.mus240_group_sandboxes 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid()
  )
);

CREATE POLICY "Users can create sandboxes for their groups" 
ON public.mus240_group_sandboxes 
FOR INSERT 
WITH CHECK (
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own sandboxes" 
ON public.mus240_group_sandboxes 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own sandboxes or group leaders can delete" 
ON public.mus240_group_sandboxes 
FOR DELETE 
USING (
  created_by = auth.uid() OR
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid() AND role = 'leader'
  )
);

-- Similar policies for notes
CREATE POLICY "Users can view notes for their groups" 
ON public.mus240_group_notes 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid()
  )
);

CREATE POLICY "Users can create notes for their groups" 
ON public.mus240_group_notes 
FOR INSERT 
WITH CHECK (
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own notes" 
ON public.mus240_group_notes 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes or group leaders can delete" 
ON public.mus240_group_notes 
FOR DELETE 
USING (
  created_by = auth.uid() OR
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid() AND role = 'leader'
  )
);

-- Similar policies for links
CREATE POLICY "Users can view links for their groups" 
ON public.mus240_group_links 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid()
  )
);

CREATE POLICY "Users can create links for their groups" 
ON public.mus240_group_links 
FOR INSERT 
WITH CHECK (
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own links" 
ON public.mus240_group_links 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own links or group leaders can delete" 
ON public.mus240_group_links 
FOR DELETE 
USING (
  created_by = auth.uid() OR
  group_id IN (
    SELECT group_id 
    FROM mus240_group_memberships 
    WHERE member_id = auth.uid() AND role = 'leader'
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_mus240_group_sandboxes_updated_at
BEFORE UPDATE ON public.mus240_group_sandboxes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mus240_group_notes_updated_at
BEFORE UPDATE ON public.mus240_group_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mus240_group_links_updated_at
BEFORE UPDATE ON public.mus240_group_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();