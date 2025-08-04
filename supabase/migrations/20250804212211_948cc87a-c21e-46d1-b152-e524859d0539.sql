-- Create the gw_auditions table that the application code expects
CREATE TABLE IF NOT EXISTS public.gw_auditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  sang_in_middle_school BOOLEAN DEFAULT false,
  sang_in_high_school BOOLEAN DEFAULT false,
  high_school_years INTEGER,
  plays_instrument BOOLEAN DEFAULT false,
  instrument_details TEXT,
  is_soloist BOOLEAN DEFAULT false,
  soloist_rating INTEGER,
  high_school_section TEXT,
  reads_music BOOLEAN DEFAULT false,
  interested_in_voice_lessons BOOLEAN DEFAULT false,
  interested_in_music_fundamentals BOOLEAN DEFAULT false,
  personality_description TEXT,
  interested_in_leadership BOOLEAN DEFAULT false,
  additional_info TEXT,
  audition_date TIMESTAMP WITH TIME ZONE NOT NULL,
  audition_time TEXT NOT NULL,
  selfie_url TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_auditions ENABLE ROW LEVEL SECURITY;

-- Create policies for gw_auditions
CREATE POLICY "Users can view their own auditions" 
ON public.gw_auditions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own auditions" 
ON public.gw_auditions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auditions" 
ON public.gw_auditions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all auditions" 
ON public.gw_auditions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can manage all auditions" 
ON public.gw_auditions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create trigger for updated_at
CREATE TRIGGER update_gw_auditions_updated_at
BEFORE UPDATE ON public.gw_auditions
FOR EACH ROW
EXECUTE FUNCTION public.update_audition_updated_at();

-- Create an active audition session for current applications
INSERT INTO public.audition_sessions (
  id,
  name,
  description,
  start_date,
  end_date,
  application_deadline,
  requirements,
  max_applicants,
  is_active,
  created_by
) VALUES (
  gen_random_uuid(),
  'Spring 2025 Auditions',
  'Spring semester auditions for the Spelman College Glee Club. Open to all students interested in joining our musical family.',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '25 days',
  'Prepare a 1-2 minute song of your choice. Sight-reading materials will be provided.',
  50,
  true,
  NULL
) ON CONFLICT DO NOTHING;

-- Create audition time blocks for the next few weeks
INSERT INTO public.audition_time_blocks (
  id,
  start_date,
  end_date,
  appointment_duration_minutes,
  is_active
) VALUES 
  -- Week 1: Monday-Friday, 2-6 PM
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '1 week')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '1 week')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '1 day')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '1 day')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '2 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '2 days')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '3 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '3 days')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '4 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '1 week' + INTERVAL '4 days')::date + TIME '18:00', 15, true),
  -- Week 2: Monday-Friday, 2-6 PM
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '2 weeks')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '2 weeks')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '1 day')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '1 day')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '2 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '2 days')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '3 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '3 days')::date + TIME '18:00', 15, true),
  (gen_random_uuid(), (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '4 days')::date + TIME '14:00', (CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '4 days')::date + TIME '18:00', 15, true)
ON CONFLICT DO NOTHING;