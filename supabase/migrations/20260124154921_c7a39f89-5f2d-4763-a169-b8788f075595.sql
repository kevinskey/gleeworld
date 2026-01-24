-- Create media folders table
CREATE TABLE public.gw_media_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.gw_media_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6366f1'
);

-- Add folder_id to gw_media_library if not exists
ALTER TABLE public.gw_media_library 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.gw_media_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.gw_media_folders ENABLE ROW LEVEL SECURITY;

-- Public can view folders
CREATE POLICY "Folders are viewable by everyone" 
ON public.gw_media_folders 
FOR SELECT 
USING (true);

-- Admins can manage folders
CREATE POLICY "Admins can insert folders" 
ON public.gw_media_folders 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin') 
    AND is_active = true
  )
);

CREATE POLICY "Admins can update folders" 
ON public.gw_media_folders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin') 
    AND is_active = true
  )
);

CREATE POLICY "Admins can delete folders" 
ON public.gw_media_folders 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin') 
    AND is_active = true
  )
);

-- Index for parent lookup
CREATE INDEX idx_media_folders_parent ON public.gw_media_folders(parent_id);
CREATE INDEX idx_media_library_folder ON public.gw_media_library(folder_id);