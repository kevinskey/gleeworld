-- Create alumnae page builder tables

-- Table for page sections/containers
CREATE TABLE IF NOT EXISTS public.alumnae_page_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_type TEXT NOT NULL CHECK (section_type IN ('hero', 'content', 'media', 'form', 'spotlight', 'newsletter')),
  title TEXT,
  layout_type TEXT NOT NULL DEFAULT 'single' CHECK (layout_type IN ('single', 'two-column', 'three-column', 'grid')),
  row_height TEXT DEFAULT 'auto',
  background_color TEXT,
  background_image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for section content items
CREATE TABLE IF NOT EXISTS public.alumnae_section_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.alumnae_page_sections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('text', 'image', 'video', 'audio', 'pdf', 'form', 'link', 'spotlight', 'newsletter')),
  title TEXT,
  content TEXT,
  media_url TEXT,
  media_id UUID REFERENCES public.gw_media_library(id) ON DELETE SET NULL,
  link_url TEXT,
  link_target TEXT DEFAULT 'internal' CHECK (link_target IN ('internal', 'external')),
  column_position INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  width_percentage INTEGER DEFAULT 100,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for alumnae forms
CREATE TABLE IF NOT EXISTS public.alumnae_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_name TEXT NOT NULL,
  form_description TEXT,
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  submission_email TEXT,
  success_message TEXT DEFAULT 'Thank you for your submission!',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for form submissions
CREATE TABLE IF NOT EXISTS public.alumnae_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.alumnae_forms(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for alumnae user management
CREATE TABLE IF NOT EXISTS public.alumnae_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  graduation_year INTEGER,
  major TEXT,
  current_location TEXT,
  current_occupation TEXT,
  bio TEXT,
  is_mentor BOOLEAN DEFAULT false,
  mentor_areas JSONB DEFAULT '[]'::jsonb,
  profile_image_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alumnae_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alumnae_page_sections (public read, admin write)
CREATE POLICY "Anyone can view active sections"
  ON public.alumnae_page_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sections"
  ON public.alumnae_page_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE gw_profiles.id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.role = 'alumna')
    )
  );

-- RLS Policies for alumnae_section_items
CREATE POLICY "Anyone can view active items"
  ON public.alumnae_section_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage items"
  ON public.alumnae_section_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE gw_profiles.id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.role = 'alumna')
    )
  );

-- RLS Policies for alumnae_forms
CREATE POLICY "Anyone can view active forms"
  ON public.alumnae_forms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage forms"
  ON public.alumnae_forms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE gw_profiles.id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.role = 'alumna')
    )
  );

-- RLS Policies for alumnae_form_submissions
CREATE POLICY "Users can submit forms"
  ON public.alumnae_form_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by OR submitted_by IS NULL);

CREATE POLICY "Users can view their own submissions"
  ON public.alumnae_form_submissions FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Admins can view all submissions"
  ON public.alumnae_form_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE gw_profiles.id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.role = 'alumna')
    )
  );

-- RLS Policies for alumnae_users
CREATE POLICY "Anyone can view alumnae profiles"
  ON public.alumnae_users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.alumnae_users FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON public.alumnae_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE gw_profiles.id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
  );

-- Create indexes
CREATE INDEX idx_alumnae_sections_order ON public.alumnae_page_sections(sort_order);
CREATE INDEX idx_alumnae_items_section ON public.alumnae_section_items(section_id, sort_order);
CREATE INDEX idx_alumnae_forms_active ON public.alumnae_forms(is_active);
CREATE INDEX idx_alumnae_submissions_form ON public.alumnae_form_submissions(form_id, submitted_at DESC);
CREATE INDEX idx_alumnae_users_user ON public.alumnae_users(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_alumnae_sections_updated_at
  BEFORE UPDATE ON public.alumnae_page_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alumnae_items_updated_at
  BEFORE UPDATE ON public.alumnae_section_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alumnae_forms_updated_at
  BEFORE UPDATE ON public.alumnae_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alumnae_users_updated_at
  BEFORE UPDATE ON public.alumnae_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();