-- Create student_registrations table for class registrations
CREATE TABLE public.student_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    student_id TEXT NOT NULL, -- 900# field
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    music_history TEXT,
    african_american_music_interests TEXT,
    cohort_id UUID REFERENCES public.cohorts(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view their own registration" 
ON public.student_registrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own registration" 
ON public.student_registrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own registration" 
ON public.student_registrations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations" 
ON public.student_registrations 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
));

-- Create default cohort for class registrations
INSERT INTO public.cohorts (name, year, is_active) 
VALUES ('Music Class 2024', 2024, true)
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_student_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_registrations_updated_at
BEFORE UPDATE ON public.student_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_student_registrations_updated_at();