-- Create booking_requests table for managing performance inquiries
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  event_location TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  estimated_audience INTEGER,
  budget_range TEXT,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'declined', 'completed')),
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for booking requests
-- Admins and super admins can view and manage all booking requests
CREATE POLICY "Admins can manage all booking requests" 
ON public.booking_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Executive board members can view booking requests
CREATE POLICY "Executive board can view booking requests" 
ON public.booking_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_exec_board = true
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_booking_requests_updated_at
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX idx_booking_requests_event_date ON public.booking_requests(event_date);
CREATE INDEX idx_booking_requests_created_at ON public.booking_requests(created_at);