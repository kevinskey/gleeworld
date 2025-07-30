-- Create PR Images storage bucket and related tables
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pr-images', 'pr-images', false)
ON CONFLICT (id) DO NOTHING;

-- Create PR Images table
CREATE TABLE IF NOT EXISTS public.pr_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  photographer_id UUID REFERENCES auth.users(id),
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  caption TEXT,
  taken_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_id UUID REFERENCES public.gw_events(id),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PR Image Tags table
CREATE TABLE IF NOT EXISTS public.pr_image_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PR Image Tag Associations table
CREATE TABLE IF NOT EXISTS public.pr_image_tag_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES public.pr_images(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.pr_image_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(image_id, tag_id)
);

-- Insert default tags
INSERT INTO public.pr_image_tags (name, color) VALUES
  ('Performance', '#8b5cf6'),
  ('Candid', '#06b6d4'),
  ('Event', '#10b981'),
  ('Headshots', '#f59e0b'),
  ('Rehearsal', '#ef4444'),
  ('Behind the Scenes', '#6366f1'),
  ('Tour', '#ec4899'),
  ('Group Photo', '#84cc16')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.pr_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_image_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_image_tag_associations ENABLE ROW LEVEL SECURITY;

-- Create policies for pr_images
CREATE POLICY "PR coordinators and admins can view all PR images"
ON public.pr_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can insert PR images"
ON public.pr_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can update PR images"
ON public.pr_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can delete PR images"
ON public.pr_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Create policies for pr_image_tags
CREATE POLICY "PR coordinators and admins can view all PR image tags"
ON public.pr_image_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can manage PR image tags"
ON public.pr_image_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Create policies for pr_image_tag_associations
CREATE POLICY "PR coordinators and admins can view PR image tag associations"
ON public.pr_image_tag_associations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can manage PR image tag associations"
ON public.pr_image_tag_associations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Create storage policies for pr-images bucket
CREATE POLICY "PR coordinators and admins can view PR images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pr-images' AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can upload PR images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pr-images' AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can update PR images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pr-images' AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

CREATE POLICY "PR coordinators and admins can delete PR images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pr-images' AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_pr_images_updated_at
  BEFORE UPDATE ON public.pr_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();