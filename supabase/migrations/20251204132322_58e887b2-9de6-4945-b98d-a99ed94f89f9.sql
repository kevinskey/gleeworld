-- Create folders table for organizing message groups
CREATE TABLE public.gw_message_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to message groups
ALTER TABLE public.gw_message_groups 
ADD COLUMN folder_id UUID REFERENCES public.gw_message_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.gw_message_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders
CREATE POLICY "Admins can manage folders" 
ON public.gw_message_folders 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

CREATE POLICY "Members can view folders" 
ON public.gw_message_folders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid()
  )
);