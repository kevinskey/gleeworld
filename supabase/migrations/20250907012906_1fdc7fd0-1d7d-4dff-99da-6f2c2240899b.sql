-- Create service providers table
CREATE TABLE public.gw_service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT, -- e.g., "Dr.", "Professor", etc.
  department TEXT,
  bio TEXT,
  profile_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  services_offered TEXT[], -- Array of service categories they can provide
  default_calendar_id UUID REFERENCES gw_calendars(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create provider availability table for working hours and time slots
CREATE TABLE public.gw_provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES gw_service_providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  break_between_slots_minutes INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, day_of_week, start_time)
);

-- Create provider time off/unavailable periods
CREATE TABLE public.gw_provider_time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES gw_service_providers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME, -- If NULL, applies to full day
  end_time TIME, -- If NULL, applies to full day
  reason TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_type TEXT, -- 'weekly', 'monthly', 'yearly'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add provider_id to gw_appointments table
ALTER TABLE public.gw_appointments 
ADD COLUMN provider_id UUID REFERENCES gw_service_providers(id);

-- Add provider_id to gw_services table
ALTER TABLE public.gw_services 
ADD COLUMN provider_id UUID REFERENCES gw_service_providers(id);

-- Create indexes for better performance
CREATE INDEX idx_provider_availability_provider_day ON gw_provider_availability(provider_id, day_of_week);
CREATE INDEX idx_provider_time_off_provider_dates ON gw_provider_time_off(provider_id, start_date, end_date);
CREATE INDEX idx_appointments_provider ON gw_appointments(provider_id);
CREATE INDEX idx_services_provider ON gw_services(provider_id);

-- Enable RLS on all new tables
ALTER TABLE public.gw_service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_provider_time_off ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_service_providers
CREATE POLICY "Anyone can view active providers" 
ON public.gw_service_providers 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Providers can update their own profile" 
ON public.gw_service_providers 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all providers" 
ON public.gw_service_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for gw_provider_availability
CREATE POLICY "Anyone can view provider availability" 
ON public.gw_provider_availability 
FOR SELECT 
USING (true);

CREATE POLICY "Providers can manage their own availability" 
ON public.gw_provider_availability 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_service_providers sp 
    WHERE sp.id = provider_id 
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all availability" 
ON public.gw_provider_availability 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for gw_provider_time_off
CREATE POLICY "Providers can view their own time off" 
ON public.gw_provider_time_off 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM gw_service_providers sp 
    WHERE sp.id = provider_id 
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage their own time off" 
ON public.gw_provider_time_off 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_service_providers sp 
    WHERE sp.id = provider_id 
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all time off" 
ON public.gw_provider_time_off 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_gw_service_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_gw_provider_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_gw_provider_time_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.gw_service_providers
  FOR EACH ROW EXECUTE FUNCTION update_gw_service_providers_updated_at();

CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.gw_provider_availability
  FOR EACH ROW EXECUTE FUNCTION update_gw_provider_availability_updated_at();

CREATE TRIGGER update_provider_time_off_updated_at
  BEFORE UPDATE ON public.gw_provider_time_off
  FOR EACH ROW EXECUTE FUNCTION update_gw_provider_time_off_updated_at();

-- Insert Dr. Johnson as the first service provider
INSERT INTO public.gw_service_providers (
  user_id,
  provider_name,
  email,
  title,
  department,
  bio,
  services_offered,
  default_calendar_id
) VALUES (
  '4e6c2ec0-1f83-449a-a984-8920f6056ab5', -- Dr. Johnson's user ID
  'Dr. Kevin Phillip Johnson',
  'kpj64110@gmail.com',
  'Dr.',
  'Music Department',
  'Associate Professor of Music at Spelman College, directing the acclaimed Spelman College Glee Club.',
  ARRAY['general', 'consultation', 'voice-lesson', 'tutorial'],
  (SELECT id FROM gw_calendars WHERE name = 'Appointments' LIMIT 1)
);

-- Set up default availability for Dr. Johnson (Monday-Friday, 9 AM - 5 PM)
INSERT INTO public.gw_provider_availability (
  provider_id,
  day_of_week,
  start_time,
  end_time,
  slot_duration_minutes,
  break_between_slots_minutes
) 
SELECT 
  sp.id,
  day_num,
  '09:00'::TIME,
  '17:00'::TIME,
  30,
  15
FROM public.gw_service_providers sp,
     generate_series(1, 5) as day_num -- Monday to Friday
WHERE sp.email = 'kpj64110@gmail.com';