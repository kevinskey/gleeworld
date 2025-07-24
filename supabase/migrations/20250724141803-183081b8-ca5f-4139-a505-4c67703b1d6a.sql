-- Create spotlight content table for managing featured content
CREATE TABLE public.gw_spotlight_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  spotlight_type TEXT NOT NULL DEFAULT 'member' CHECK (spotlight_type IN ('member', 'event', 'achievement', 'news', 'alumni', 'performance')),
  featured_person_id UUID,
  featured_event_id UUID,
  image_url TEXT,
  external_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,
  publish_date DATE DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_spotlight_creator FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_spotlight_person FOREIGN KEY (featured_person_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_spotlight_event FOREIGN KEY (featured_event_id) REFERENCES public.gw_events(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.gw_spotlight_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can view active spotlight content" 
ON public.gw_spotlight_content 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all spotlight content" 
ON public.gw_spotlight_content 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can create spotlight content" 
ON public.gw_spotlight_content 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_spotlight_content_type ON public.gw_spotlight_content(spotlight_type);
CREATE INDEX idx_spotlight_content_active ON public.gw_spotlight_content(is_active);
CREATE INDEX idx_spotlight_content_featured ON public.gw_spotlight_content(is_featured);
CREATE INDEX idx_spotlight_content_display_order ON public.gw_spotlight_content(display_order);
CREATE INDEX idx_spotlight_content_publish_date ON public.gw_spotlight_content(publish_date);

-- Create trigger for updated_at
CREATE TRIGGER update_spotlight_content_updated_at 
  BEFORE UPDATE ON public.gw_spotlight_content 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- Insert some sample spotlight content
INSERT INTO public.gw_spotlight_content (
  title, 
  description, 
  content, 
  spotlight_type, 
  created_by,
  is_featured
) VALUES (
  'Welcome to Glee Club Spotlight',
  'Celebrating 100+ years of musical excellence at Spelman College',
  'The Spelman College Glee Club continues to amaze and inspire audiences worldwide with our rich musical heritage and outstanding performances.',
  'news',
  (SELECT id FROM auth.users LIMIT 1),
  true
);

-- Create analytics table for spotlight content
CREATE TABLE public.gw_spotlight_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spotlight_id UUID NOT NULL REFERENCES public.gw_spotlight_content(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'click', 'share')),
  user_id UUID,
  ip_address inet,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_spotlight_analytics_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on analytics table
ALTER TABLE public.gw_spotlight_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics
CREATE POLICY "Admins can view all spotlight analytics" 
ON public.gw_spotlight_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Anyone can insert analytics" 
ON public.gw_spotlight_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for analytics
CREATE INDEX idx_spotlight_analytics_spotlight_id ON public.gw_spotlight_analytics(spotlight_id);
CREATE INDEX idx_spotlight_analytics_action_type ON public.gw_spotlight_analytics(action_type);
CREATE INDEX idx_spotlight_analytics_created_at ON public.gw_spotlight_analytics(created_at);