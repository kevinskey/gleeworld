-- Create Glee Cam Categories table for managing media categories
CREATE TABLE public.glee_cam_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'Camera',
  icon_bg VARCHAR(50) DEFAULT 'bg-blue-900/50',
  icon_color VARCHAR(50) DEFAULT 'text-blue-400',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.glee_cam_categories ENABLE ROW LEVEL SECURITY;

-- Public read access for active categories
CREATE POLICY "Anyone can view active categories"
ON public.glee_cam_categories
FOR SELECT
USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage categories"
ON public.glee_cam_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_glee_cam_categories_updated_at
BEFORE UPDATE ON public.glee_cam_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories based on existing quick capture categories
INSERT INTO public.glee_cam_categories (name, slug, description, icon, icon_bg, icon_color, display_order) VALUES
  ('Christmas Selfies', 'christmas-carol-selfies', 'Holiday spirit moments', 'Sparkles', 'bg-rose-900/50', 'text-rose-400', 1),
  ('Glee Cam Pics', 'glee-cam-pics', 'Candid member photos', 'Camera', 'bg-blue-900/50', 'text-blue-400', 2),
  ('Glee Cam Videos', 'glee-cam-videos', 'Member video moments', 'Video', 'bg-purple-900/50', 'text-purple-400', 3),
  ('Voice Parts', 'voice-part-recording', 'Voice part recordings', 'Mic', 'bg-emerald-900/50', 'text-emerald-400', 4),
  ('ExecBoard Videos', 'execboard-video', 'Executive board content', 'Users', 'bg-amber-900/50', 'text-amber-400', 5);

-- Add glee_cam_category_id to gw_media_library for proper relational linking
ALTER TABLE public.gw_media_library
ADD COLUMN glee_cam_category_id UUID REFERENCES public.glee_cam_categories(id);

-- Create index for faster category lookups
CREATE INDEX idx_media_glee_cam_category ON public.gw_media_library(glee_cam_category_id);

-- Update existing media to link to new categories based on category string
UPDATE public.gw_media_library m
SET glee_cam_category_id = c.id
FROM public.glee_cam_categories c
WHERE m.category = c.slug;