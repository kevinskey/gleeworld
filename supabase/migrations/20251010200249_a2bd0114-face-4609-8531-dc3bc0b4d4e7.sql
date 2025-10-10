-- Create table for monthly newsletters
CREATE TABLE IF NOT EXISTS public.alumnae_newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  content TEXT NOT NULL,
  pdf_url TEXT,
  cover_image_url TEXT,
  published_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(month, year)
);

-- Create table for alumnae interview segments
CREATE TABLE IF NOT EXISTS public.alumnae_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewee_name TEXT NOT NULL,
  interviewee_class_year INTEGER,
  interviewee_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  interview_type TEXT CHECK (interview_type IN ('video', 'audio', 'text')) DEFAULT 'text',
  video_url TEXT,
  audio_url TEXT,
  transcript TEXT,
  excerpt TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alumnae_newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletters
CREATE POLICY "Anyone can view published newsletters"
  ON public.alumnae_newsletters
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Alumnae liaison can manage newsletters"
  ON public.alumnae_newsletters
  FOR ALL
  USING (user_has_alumnae_liaison_role(auth.uid()))
  WITH CHECK (user_has_alumnae_liaison_role(auth.uid()));

CREATE POLICY "Admins can manage all newsletters"
  ON public.alumnae_newsletters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for interviews
CREATE POLICY "Anyone can view published interviews"
  ON public.alumnae_interviews
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Alumnae liaison can manage interviews"
  ON public.alumnae_interviews
  FOR ALL
  USING (user_has_alumnae_liaison_role(auth.uid()))
  WITH CHECK (user_has_alumnae_liaison_role(auth.uid()));

CREATE POLICY "Admins can manage all interviews"
  ON public.alumnae_interviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_alumnae_newsletters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alumnae_newsletters_updated_at
  BEFORE UPDATE ON public.alumnae_newsletters
  FOR EACH ROW
  EXECUTE FUNCTION update_alumnae_newsletters_updated_at();

CREATE OR REPLACE FUNCTION update_alumnae_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alumnae_interviews_updated_at
  BEFORE UPDATE ON public.alumnae_interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_alumnae_interviews_updated_at();