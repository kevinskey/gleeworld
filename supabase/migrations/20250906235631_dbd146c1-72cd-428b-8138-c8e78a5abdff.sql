-- Create a new simplified appointment scheduling system
DROP TABLE IF EXISTS gw_appointments CASCADE;
DROP TABLE IF EXISTS gw_services CASCADE;
DROP TABLE IF EXISTS gw_appointment_history CASCADE;

-- Create services table for appointment types
CREATE TABLE public.gw_appointment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_attendees INTEGER DEFAULT 1,
  location TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create simplified appointments table
CREATE TABLE public.gw_simple_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.gw_appointment_services(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_simple_appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for services (public can view, admins can manage)
CREATE POLICY "Anyone can view active services" 
ON public.gw_appointment_services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage services" 
ON public.gw_appointment_services 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create policies for appointments (public can create, admins can manage)
CREATE POLICY "Anyone can create appointments" 
ON public.gw_simple_appointments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all appointments" 
ON public.gw_simple_appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update appointments" 
ON public.gw_simple_appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete appointments" 
ON public.gw_simple_appointments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_appointment_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_simple_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_services_updated_at
BEFORE UPDATE ON public.gw_appointment_services
FOR EACH ROW
EXECUTE FUNCTION public.update_appointment_services_updated_at();

CREATE TRIGGER update_simple_appointments_updated_at
BEFORE UPDATE ON public.gw_simple_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_simple_appointments_updated_at();

-- Insert some default services
INSERT INTO public.gw_appointment_services (name, description, duration_minutes, price, location, color) VALUES
('General Consultation', 'General consultation and advice', 60, 75.00, 'Office', '#3B82F6'),
('Strategy Session', 'Strategic planning and roadmap discussion', 90, 125.00, 'Conference Room', '#10B981'),
('Quick Check-in', 'Brief consultation for existing clients', 30, 50.00, 'Office', '#F59E0B');