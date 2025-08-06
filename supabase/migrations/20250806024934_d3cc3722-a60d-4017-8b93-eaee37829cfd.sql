-- Create services table for managing scheduling services
CREATE TABLE public.gw_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  capacity_min INTEGER DEFAULT 1,
  capacity_max INTEGER DEFAULT 1,
  price_amount DECIMAL(10,2) DEFAULT 0,
  price_display TEXT DEFAULT 'Free',
  location TEXT,
  instructor TEXT,
  badge_text TEXT,
  badge_color TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  booking_buffer_minutes INTEGER DEFAULT 15,
  advance_booking_days INTEGER DEFAULT 30,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_services ENABLE ROW LEVEL SECURITY;

-- Create policies for services
CREATE POLICY "Anyone can view active services" 
ON public.gw_services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all services" 
ON public.gw_services 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create service availability table
CREATE TABLE public.gw_service_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.gw_services(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for availability
ALTER TABLE public.gw_service_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for availability
CREATE POLICY "Anyone can view active availability" 
ON public.gw_service_availability 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage availability" 
ON public.gw_service_availability 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger for services
CREATE TRIGGER update_gw_services_updated_at
  BEFORE UPDATE ON public.gw_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for availability
CREATE TRIGGER update_gw_service_availability_updated_at
  BEFORE UPDATE ON public.gw_service_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial services data
INSERT INTO public.gw_services (
  name, description, image_url, duration_minutes, capacity_min, capacity_max, 
  price_amount, price_display, location, instructor, badge_text, badge_color, category
) VALUES
  (
    'Voice Coaching',
    'Individual voice coaching session',
    '/src/assets/voice-coaching.jpg',
    45,
    1,
    1,
    75.00,
    '$75',
    'Music Room A',
    'Dr. Johnson',
    'Popular',
    'bg-blue-500',
    'coaching'
  ),
  (
    'Section Rehearsal',
    'Soprano section practice',
    '/src/assets/section-rehearsal.jpg',
    90,
    8,
    12,
    0.00,
    'Free',
    'Rehearsal Hall',
    'Section Leader',
    'Premium',
    'bg-yellow-500',
    'rehearsal'
  ),
  (
    'Audition Prep',
    'Prepare for upcoming auditions',
    '/src/assets/audition-prep.jpg',
    60,
    1,
    4,
    45.00,
    '$45',
    'Practice Room 3',
    'Ms. Williams',
    NULL,
    NULL,
    'coaching'
  ),
  (
    'Piano Accompaniment',
    'Piano accompaniment session',
    '/src/assets/piano-accompaniment.jpg',
    30,
    1,
    2,
    40.00,
    '$40',
    'Music Room B',
    'Piano Faculty',
    'New',
    'bg-green-500',
    'accompaniment'
  ),
  (
    'Music Theory',
    'Music theory fundamentals',
    '/src/assets/music-theory.jpg',
    45,
    1,
    6,
    50.00,
    '$50',
    'Classroom 101',
    'Theory Instructor',
    NULL,
    NULL,
    'education'
  ),
  (
    'Ensemble Rehearsal',
    'Full Glee Club rehearsal',
    '/src/assets/ensemble-rehearsal.jpg',
    120,
    40,
    60,
    0.00,
    'Free',
    'Main Concert Hall',
    'Director',
    'Popular',
    'bg-blue-500',
    'rehearsal'
  );

-- Insert sample availability (Monday-Friday, 9 AM - 5 PM for most services)
INSERT INTO public.gw_service_availability (service_id, day_of_week, start_time, end_time)
SELECT 
  s.id,
  generate_series(1, 5) as day_of_week, -- Monday to Friday
  '09:00'::TIME as start_time,
  '17:00'::TIME as end_time
FROM public.gw_services s
WHERE s.name IN ('Voice Coaching', 'Audition Prep', 'Piano Accompaniment', 'Music Theory');

-- Insert specific availability for group activities
INSERT INTO public.gw_service_availability (service_id, day_of_week, start_time, end_time)
SELECT 
  s.id,
  2 as day_of_week, -- Tuesday
  '19:00'::TIME as start_time,
  '21:00'::TIME as end_time
FROM public.gw_services s
WHERE s.name = 'Section Rehearsal';

INSERT INTO public.gw_service_availability (service_id, day_of_week, start_time, end_time)
SELECT 
  s.id,
  4 as day_of_week, -- Thursday
  '19:00'::TIME as start_time,
  '21:00'::TIME as end_time
FROM public.gw_services s
WHERE s.name = 'Section Rehearsal';

-- Ensemble rehearsals on Tuesday and Thursday evenings
INSERT INTO public.gw_service_availability (service_id, day_of_week, start_time, end_time)
SELECT 
  s.id,
  day_of_week,
  '18:00'::TIME as start_time,
  '20:00'::TIME as end_time
FROM public.gw_services s
CROSS JOIN (VALUES (2), (4)) AS days(day_of_week) -- Tuesday and Thursday
WHERE s.name = 'Ensemble Rehearsal';