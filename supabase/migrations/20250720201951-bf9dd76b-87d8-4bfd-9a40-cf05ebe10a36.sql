-- Create appointments table for scheduling system
CREATE TABLE public.gw_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  appointment_type TEXT NOT NULL DEFAULT 'general' CHECK (appointment_type IN ('general', 'meeting', 'consultation', 'rehearsal', 'other')),
  
  -- Client information
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  
  -- Internal tracking
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Public can create appointments" 
ON public.gw_appointments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins and assigned users can view appointments" 
ON public.gw_appointments 
FOR SELECT 
USING (
  auth.uid() = assigned_to OR
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'secretary')
  )
);

CREATE POLICY "Admins and assigned users can update appointments" 
ON public.gw_appointments 
FOR UPDATE 
USING (
  auth.uid() = assigned_to OR
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'secretary')
  )
);

CREATE POLICY "Admins can delete appointments" 
ON public.gw_appointments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_gw_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gw_appointments_updated_at
BEFORE UPDATE ON public.gw_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_gw_appointments_updated_at();

-- Create appointment availability table for time slots
CREATE TABLE public.gw_appointment_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for availability
ALTER TABLE public.gw_appointment_availability ENABLE ROW LEVEL SECURITY;

-- Policies for availability (only admins can manage)
CREATE POLICY "Everyone can view availability" 
ON public.gw_appointment_availability 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage availability" 
ON public.gw_appointment_availability 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Insert default availability (Monday-Friday, 9 AM - 5 PM)
INSERT INTO public.gw_appointment_availability (day_of_week, start_time, end_time) VALUES
(1, '09:00', '17:00'), -- Monday
(2, '09:00', '17:00'), -- Tuesday
(3, '09:00', '17:00'), -- Wednesday
(4, '09:00', '17:00'), -- Thursday
(5, '09:00', '17:00'); -- Friday