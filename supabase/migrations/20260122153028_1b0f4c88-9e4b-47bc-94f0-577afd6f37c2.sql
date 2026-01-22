-- Create academy_course_badges table for managing course badge images in the slider
CREATE TABLE public.academy_course_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_code TEXT NOT NULL UNIQUE,
  course_title TEXT NOT NULL,
  badge_image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.academy_course_badges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active badges" 
ON public.academy_course_badges 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage badges" 
ON public.academy_course_badges 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_academy_course_badges_updated_at
BEFORE UPDATE ON public.academy_course_badges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default course badges
INSERT INTO public.academy_course_badges (course_code, course_title, badge_image_url, display_order)
VALUES 
  ('MUS 070', 'Glee Club', '', 1),
  ('MUS 240', 'Survey of African American Music', '', 2),
  ('LH 100', 'Bowman Scholars', '', 3)
ON CONFLICT (course_code) DO NOTHING;